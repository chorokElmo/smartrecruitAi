"""
RecommendationService — AI-powered job matching.

Score formula (Part 7):
  final = skill_score × 0.60 + title_score × 0.25 + experience_score × 0.15

  skill_score      : two-pass skill matcher (exact + semantic fuzzy), 0.0–1.0
  title_score      : cosine similarity between user domain and job title, 0.0–1.0
  experience_score : linear fit of candidate's years vs job requirement, 0.0–1.0
                     defaults to 0.5 (neutral) when either side is unknown

Backward compatible: SemanticMatcher.match() contract unchanged.
"""

import re
import uuid
import logging

import numpy as np
from sqlalchemy.orm import Session

from app.repositories.recommendation_repository import RecommendationRepository
from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
from app.schemas.recommendation import RecommendationResponse
from app.core.exceptions import BadRequestError
from app.ai.embedder import encode

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────
SCORE_THRESHOLD  = 0.10
MAX_JOBS_SCANNED = 500
MAX_RECS         = 30

# Weights — must sum to 1.0
W_SKILL      = 0.60
W_TITLE      = 0.25
W_EXPERIENCE = 0.15


# ── Score component helpers ────────────────────────────────────

def _parse_years(years_str: str | None) -> float | None:
    """
    Convert a years_experience string to a float.
    '3'  → 3.0
    '5+' → 5.0
    None / '' → None
    """
    if not years_str:
        return None
    clean = years_str.replace("+", "").strip()
    try:
        return float(clean)
    except ValueError:
        return None


def _compute_experience_score(user_years_str: str | None, required_years_str: str | None) -> float:
    """
    Linear decay: 1.0 when user meets/exceeds requirement, decays proportionally below.
    Returns 0.5 (neutral) when either side is unknown.

    Examples:
      user=5, req=3  → 1.0
      user=2, req=4  → 0.5  (50% coverage)
      user=None       → 0.5
    """
    user_years = _parse_years(user_years_str)
    req_years  = _parse_years(required_years_str)

    if user_years is None or req_years is None or req_years <= 0:
        return 0.5   # neutral — no penalty for missing data

    return min(1.0, user_years / req_years)


def _compute_title_score(user_domain: str | None, job_title: str) -> float:
    """
    Semantic similarity between user's professional domain and the job title.
    Returns 0.5 (neutral) if user has no domain set.

    Uses the same sentence-transformer already loaded at startup.
    """
    if not user_domain or not job_title:
        return 0.5

    try:
        vecs = encode([user_domain, job_title])   # (2, 384) L2-normalised
        sim  = float(np.clip(vecs[0] @ vecs[1], 0.0, 1.0))
        return round(sim, 4)
    except Exception as exc:
        logger.debug("title_score encoding failed: %s", exc)
        return 0.5


def _build_explanation(
    score:            float,
    skill_score:      float,
    title_score:      float,
    experience_score: float,
    matching_skills:  list[str],
) -> str:
    """
    Human-readable one-liner for display in the frontend.
    e.g. "Strong match (78%) — skills 82%, title 74%, exp 60%"
    """
    pct = int(score * 100)
    if score >= 0.75:   label = "Strong match"
    elif score >= 0.50: label = "Good match"
    elif score >= 0.30: label = "Partial match"
    else:               label = "Weak match"

    skill_pct = int(skill_score      * 100)
    title_pct = int(title_score      * 100)
    exp_pct   = int(experience_score * 100)

    base = f"{label} ({pct}%) — skills {skill_pct}%, title {title_pct}%, exp {exp_pct}%"
    if matching_skills:
        shown = ", ".join(matching_skills[:3])
        tail  = f" +{len(matching_skills)-3} more" if len(matching_skills) > 3 else ""
        base += f" | matched: {shown}{tail}"
    return base


# ── Main service ───────────────────────────────────────────────

class RecommendationService:
    def __init__(self, db: Session, matcher=None):
        self.rec_repo  = RecommendationRepository(db)
        self.user_repo = UserRepository(db)
        self.job_repo  = JobRepository(db)
        self.matcher   = matcher

    def generate(self, user_id: str) -> list[RecommendationResponse]:
        """
        Run the full AI matching pipeline and persist results.

        Formula: final = skill×0.60 + title×0.25 + experience×0.15
        """
        if self.matcher is None:
            raise RuntimeError(
                "SemanticMatcher not injected — use RecommendationService(db, matcher)"
            )

        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise BadRequestError("User not found")
        if not user.skills:
            raise BadRequestError(
                "Upload a CV or add skills to your profile first"
            )

        logger.info(
            "[Recs] Generating for user %s… (%d skills, domain=%s, exp=%s)",
            user_id[:8], len(user.skills), user.domain, user.years_experience,
        )

        jobs, _ = self.job_repo.get_all(page=1, size=MAX_JOBS_SCANNED)
        if not jobs:
            return []

        logger.info("[Recs] Scoring %d jobs (3-component formula)", len(jobs))

        scored: list[dict] = []
        for job in jobs:
            # Component 1 — skill score (two-pass matcher)
            skill_result = self.matcher.match(user.skills, job.required_skills or [])
            skill_score  = skill_result["score"]

            # Component 2 — title score (domain vs job title)
            title_score = _compute_title_score(user.domain, job.title)

            # Component 3 — experience score (years comparison)
            exp_score = _compute_experience_score(
                user.years_experience,
                job.required_experience,
            )

            # Weighted final
            final = round(
                skill_score * W_SKILL
                + title_score  * W_TITLE
                + exp_score    * W_EXPERIENCE,
                4,
            )

            if final >= SCORE_THRESHOLD:
                matching = skill_result["matching_skills"]
                scored.append({
                    "job":              job,
                    "score":            final,
                    "skill_score":      round(skill_score, 4),
                    "title_score":      round(title_score, 4),
                    "experience_score": round(exp_score, 4),
                    "semantic_score":   skill_result["semantic_score"],
                    "keyword_score":    skill_result["keyword_score"],
                    "matching_skills":  matching,
                    "missing_skills":   skill_result["missing_skills"],
                    "explanation":      _build_explanation(
                        final, skill_score, title_score, exp_score, matching
                    ),
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        scored = scored[:MAX_RECS]

        logger.info(
            "[Recs] %d matches (threshold=%.2f, scanned=%d)",
            len(scored), SCORE_THRESHOLD, len(jobs),
        )

        saved = []
        try:
            self.rec_repo.delete_by_user(uuid.UUID(user_id))
            for entry in scored:
                rec = self.rec_repo.upsert(
                    user_id          = uuid.UUID(user_id),
                    job_id           = entry["job"].id,
                    score            = entry["score"],
                    matching         = entry["matching_skills"],
                    missing          = entry["missing_skills"],
                    semantic_score   = entry["semantic_score"],
                    keyword_score    = entry["keyword_score"],
                    skill_score      = entry["skill_score"],
                    title_score      = entry["title_score"],
                    experience_score = entry["experience_score"],
                    explanation      = entry["explanation"],
                )
                saved.append(RecommendationResponse.model_validate(rec))
        except Exception as e:
            logger.error("[Recs] Failed to persist: %s", e, exc_info=True)
            raise

        return saved

    def get_recommendations(self, user_id: str) -> list[RecommendationResponse]:
        """Return stored recommendations — no recomputation."""
        recs = self.rec_repo.get_by_user(uuid.UUID(user_id))
        return [RecommendationResponse.model_validate(r) for r in recs]
