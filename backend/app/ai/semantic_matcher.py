"""
Two-pass skill matcher: exact keyword match → semantic fuzzy match.

ALGORITHM
─────────
  Pass 1 — Exact regex match  (fast, O(n), no model needed)
    Case-insensitive string comparison.
    Score: exact_count / total_required

  Pass 2 — Semantic fuzzy match on UNMATCHED skills only
    Runs sentence-transformers (all-MiniLM-L6-v2) on the skills that
    did NOT exact-match in Pass 1. One encode() call for all of them.
    For each unmatched required skill → find the best cosine similarity
    across the user's unmatched skills. Count it if sim ≥ FUZZY_THRESHOLD.
    Score contribution: actual similarity value (graduated, not binary).

  Final score = (exact_count + Σ fuzzy_similarities) / total_required

WHY SKILL-LEVEL EMBEDDINGS (not full-text)?
  Full-text "Python/Django dev" vs "Java/Spring job" → sim ≈ 0.75
  (both are "software developer" — the model can't distinguish them)

  Skill-level fuzzy matching is sharper:
    "React"  → "ReactJS"          sim ≈ 0.92  ✓  counts
    "ML"     → "Machine Learning" sim ≈ 0.87  ✓  counts
    "Python" → "Java"             sim ≈ 0.35  ✗  ignored
  Only short tokens are encoded (10–30 per call) — very fast on CPU.

WORKED EXAMPLE
  User skills:   ["React", "ML", "Python"]
  Required:      ["ReactJS", "Machine Learning", "SQL"]

  Pass 1 — exact:  no matches          → keyword_score = 0/3 = 0.00
  Pass 2 — fuzzy:
    "ReactJS"          ← "React"   sim=0.92  ✓
    "Machine Learning" ← "ML"      sim=0.87  ✓
    "SQL"              ← "Python"  sim=0.31  ✗ (below threshold 0.72)

  final = (0 + 0.92 + 0.87 + 0.0) / 3 = 0.60

  Old exact-only scorer:  0/3 = 0.00   ← badly penalises synonyms
  New two-pass scorer:    0.60          ← correctly rewards the match
"""

import logging

import numpy as np

from app.ai.embedder import encode

logger = logging.getLogger(__name__)

# ── Tuneable constants ─────────────────────────────────────────────────────────

# Minimum cosine similarity to count a fuzzy skill match.
# 0.72 captures variant spellings (React/ReactJS, Postgres/PostgreSQL)
# while rejecting true mismatches (Python/Java ~0.45, SQL/NoSQL ~0.39).
FUZZY_THRESHOLD = 0.72

# ── Tech abbreviation dictionary ───────────────────────────────────────────────
# Maps lowercase abbreviations/short forms → expanded phrase for embedding.
#
# WHY THIS IS NEEDED:
#   all-MiniLM-L6-v2 encodes short tokens like "ML" or "k8s" as generic
#   character sequences — their embeddings land far from the full phrase.
#   Expanding them before encoding gives the model recognisable vocabulary.
#
#   "ML"  → "machine learning"     → sim("machine learning","Machine Learning")≈0.99
#   "k8s" → "kubernetes"           → sim("kubernetes","Kubernetes")≈0.99
#
# Add entries here to support new abbreviations without touching the algorithm.
TECH_ALIASES: dict[str, str] = {
    # ── Only expand SHORT ABBREVIATIONS the model cannot read as-is.
    #    Do NOT add full technology names (React, PostgreSQL, Kubernetes…)
    #    they already have good embeddings and adding them here would HURT
    #    similarity with their natural variants.
    #
    # Rule of thumb: add "x" → "y" only when:
    #   cosine_similarity(encode(["x"]), encode(["y"])) < 0.60  without expansion.
    #   After expansion both sides embed near each other → sim ≈ 0.99.

    # Machine learning / AI  (all < 0.40 without expansion)
    "ml":     "machine learning",
    "ai":     "artificial intelligence",
    "dl":     "deep learning",
    "nlp":    "natural language processing",
    "cv":     "computer vision",
    "llm":    "large language model",
    "rl":     "reinforcement learning",
    "mlops":  "machine learning operations",
    "genai":  "generative artificial intelligence",

    # Infrastructure  (k8s=0.47 without expansion)
    "k8s":    "kubernetes",
    "ci/cd":  "continuous integration continuous deployment",
    "iac":    "infrastructure as code",
    "sre":    "site reliability engineering",

    # Programming paradigms / concepts
    "oop":    "object oriented programming",
    "fp":     "functional programming",
    "tdd":    "test driven development",
    "ddd":    "domain driven design",

    # Cloud (short aliases only)
    "gcp":    "google cloud platform",

    # Misc short forms
    "py":     "python programming language",
    "qa":     "quality assurance testing",
    "bi":     "business intelligence analytics",
    "ux":     "user experience design",
    "ui":     "user interface design",
}


# ── Public API ─────────────────────────────────────────────────────────────────

def calculate_score(
    user_skills:     list[str],
    required_skills: list[str],
    user_text:       str = "",  # kept for backward-compat, not used in new algo
    job_text:        str = "",  # kept for backward-compat, not used in new algo
) -> dict:
    """
    Score a candidate's skills against a job's required skills.

    Two-pass: exact keyword match first, then semantic fuzzy matching
    on the leftover unmatched skills.

    Args:
        user_skills:     Candidate's extracted skills.
        required_skills: Job's required skills list.
        user_text:       (ignored) Legacy param kept for backward compatibility.
        job_text:        (ignored) Legacy param kept for backward compatibility.

    Returns:
        {
          "score":           float — combined score, 0.0–1.0
          "keyword_score":   float — exact-match contribution (Pass 1)
          "semantic_score":  float — fuzzy-match contribution (Pass 2)
          "matching_skills": list  — exact matches, original casing
          "fuzzy_matches":   dict  — {req_skill: {"matched_to": user_skill,
                                                   "similarity": float}}
          "missing_skills":  list  — required skills with no match at all
          "explanation":     str   — human-readable summary
        }
    """
    if not required_skills:
        return _empty("No required skills listed")
    if not user_skills:
        return _empty("No candidate skills found", missing=list(required_skills))

    total = len(required_skills)

    # ── Pass 1: exact keyword match ────────────────────────────────────────────
    exact_matching, unmatched_req, unmatched_user = _exact_pass(
        user_skills, required_skills
    )
    keyword_score = round(len(exact_matching) / total, 4)

    # ── Pass 2: semantic fuzzy match on the leftovers ──────────────────────────
    fuzzy_result = _fuzzy_pass(unmatched_user, unmatched_req)

    fuzzy_sum     = sum(v["similarity"] for v in fuzzy_result.values())
    semantic_score = round(fuzzy_sum / total, 4)

    # ── Combine ────────────────────────────────────────────────────────────────
    # Each required skill contributes at most 1.0 (exact) or its similarity
    # (fuzzy), so the sum is naturally ≤ 1.0. Float precision clamp is a safety.
    score = min(1.0, round(keyword_score + semantic_score, 4))

    # Required skills with neither an exact nor a fuzzy match
    fuzzy_matched_req = set(fuzzy_result.keys())
    missing = sorted(s for s in unmatched_req if s not in fuzzy_matched_req)

    return {
        "score":           score,
        "keyword_score":   keyword_score,
        "semantic_score":  semantic_score,
        "matching_skills": sorted(exact_matching),
        "fuzzy_matches":   fuzzy_result,
        "missing_skills":  missing,
        "explanation":     _explain(
            score, keyword_score, semantic_score, exact_matching, fuzzy_result
        ),
    }


# ── Pass 1: exact match ────────────────────────────────────────────────────────

def _exact_pass(
    user_skills:     list[str],
    required_skills: list[str],
) -> tuple[list[str], list[str], list[str]]:
    """
    Case-insensitive exact match.

    Returns:
        exact_matching:  required skills that matched a user skill exactly
        unmatched_req:   required skills with no exact match  → go to Pass 2
        unmatched_user:  user skills unused by exact matching → available for fuzzy
    """
    user_map = {s.lower(): s for s in user_skills}   # lower → original
    req_map  = {s.lower(): s for s in required_skills}

    exact_matching    = []
    unmatched_req     = []
    matched_user_keys = set()

    for req_lower, req_orig in req_map.items():
        if req_lower in user_map:
            exact_matching.append(req_orig)
            matched_user_keys.add(req_lower)
        else:
            unmatched_req.append(req_orig)

    # User skills not consumed by exact matching — available for fuzzy
    unmatched_user = [orig for lower, orig in user_map.items()
                      if lower not in matched_user_keys]

    return exact_matching, unmatched_req, unmatched_user


# ── Pass 2: semantic fuzzy match ───────────────────────────────────────────────

def _normalize(skill: str) -> str:
    """
    Expand a tech abbreviation to its full phrase before embedding.

    "ML"  → "machine learning"   (so the model sees recognisable vocabulary)
    "k8s" → "kubernetes"
    "JS"  → "javascript"

    Falls back to the original string (lowercased) for unknown terms.
    The full phrase is ONLY used for encoding; original casing is preserved
    in all output fields.
    """
    return TECH_ALIASES.get(skill.lower(), skill)


def _fuzzy_pass(
    user_skills:     list[str],
    required_skills: list[str],
) -> dict:
    """
    Semantic fuzzy match for unmatched skills only.

    Pre-processing: expand known abbreviations via TECH_ALIASES so that
    "ML" embeds like "machine learning" instead of a random 2-char token.

    Encodes all unmatched skills in ONE batch call, computes an (R × U)
    cosine similarity matrix via matrix multiplication, then picks the
    best-matching user skill for each required skill.
    Pairs below FUZZY_THRESHOLD are discarded.

    Returns:
        {
          required_skill: {
            "matched_to": user_skill,   # original user skill name
            "similarity": float,        # cosine similarity [FUZZY_THRESHOLD, 1.0]
          },
          ...
        }
    """
    if not user_skills or not required_skills:
        return {}

    try:
        # Expand abbreviations before encoding — originals kept for output
        req_normalized  = [_normalize(s) for s in required_skills]
        user_normalized = [_normalize(s) for s in user_skills]

        # One encode call: required skills first, then user skills
        all_texts  = req_normalized + user_normalized
        embeddings = encode(all_texts)          # shape: (R+U, 384), L2-normalised

        R = len(required_skills)
        req_embs  = embeddings[:R]              # (R, 384)
        user_embs = embeddings[R:]              # (U, 384)

        # Full similarity matrix — dot product == cosine sim (L2-normalised vectors)
        sim_matrix = req_embs @ user_embs.T     # (R, U)

        result: dict = {}
        for i, req_skill in enumerate(required_skills):
            best_j   = int(np.argmax(sim_matrix[i]))
            best_sim = float(np.clip(sim_matrix[i, best_j], 0.0, 1.0))

            if best_sim >= FUZZY_THRESHOLD:
                result[req_skill] = {
                    "matched_to": user_skills[best_j],   # original name, not normalised
                    "similarity": round(best_sim, 4),
                }

        return result

    except Exception as exc:
        logger.warning("Fuzzy skill matching failed, skipping: %s", exc)
        return {}


# ── Explanation builder ────────────────────────────────────────────────────────

def _explain(
    score:         float,
    keyword_score: float,
    sem_score:     float,
    exact:         list[str],
    fuzzy:         dict,
) -> str:
    """
    Build a one-line human-readable explanation.

    Examples:
      "Strong match (82%) — exact: Python, Django | fuzzy: React≈ReactJS"
      "Partial match (45%) — fuzzy: ML≈Machine Learning, k8s≈Kubernetes"
      "Weak match (12%) — exact: SQL"
    """
    pct = int(score * 100)

    if score >= 0.75:   label = "Strong match"
    elif score >= 0.50: label = "Good match"
    elif score >= 0.30: label = "Partial match"
    else:               label = "Weak match"

    parts = [f"{label} ({pct}%)"]

    if exact:
        shown = ", ".join(exact[:4])
        tail  = f" +{len(exact) - 4} more" if len(exact) > 4 else ""
        parts.append(f"exact: {shown}{tail}")

    if fuzzy:
        examples = [
            f"{req}≈{v['matched_to']}"
            for req, v in list(fuzzy.items())[:3]
        ]
        parts.append(f"fuzzy: {', '.join(examples)}")

    return " — ".join(parts)


# ── Internal util ──────────────────────────────────────────────────────────────

def _empty(explanation: str, missing: list[str] | None = None) -> dict:
    return {
        "score":           0.0,
        "keyword_score":   0.0,
        "semantic_score":  0.0,
        "matching_skills": [],
        "fuzzy_matches":   {},
        "missing_skills":  missing or [],
        "explanation":     explanation,
    }


# ── Singleton class ─────────────────────────────────────────────────────────────

class SemanticMatcher:
    """
    Thin singleton wrapper around calculate_score().

    Instantiated ONCE at app startup (app.state.matcher via lifespan)
    and shared across all requests — no per-request model loading.

    Usage:
        pct   = matcher.score(user_skills, required_skills)   # 0.0–100.0 %
        info  = matcher.match(user_skills, required_skills)   # full dict
    """

    def score(self, user_skills: list[str], required_skills: list[str]) -> float:
        """
        Combined skill match as a percentage, rounded to 1 decimal.

        Returns:
            float — 0.0 to 100.0  (e.g. 63.0 means 63% coverage)
        """
        return round(calculate_score(user_skills, required_skills)["score"] * 100, 1)

    def match(self, user_skills: list[str], required_skills: list[str]) -> dict:
        """
        Full result dict for rich display and persistence.

        Returns:
            {
              "score":           float  — combined 0.0–1.0
              "keyword_score":   float  — exact-match contribution
              "semantic_score":  float  — fuzzy-match contribution
              "matching_skills": list   — exact matches (original casing)
              "fuzzy_matches":   dict   — {req: {matched_to, similarity}}
              "missing_skills":  list   — unmatched required skills
              "explanation":     str    — human-readable one-liner
            }
        """
        return calculate_score(user_skills, required_skills)
