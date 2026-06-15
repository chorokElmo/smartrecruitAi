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
SCORE_THRESHOLD  = 0.20
MAX_JOBS_SCANNED = 873
MAX_RECS         = 200

# Weights — must sum to 1.0
W_SKILL      = 0.40
W_TITLE      = 0.25
W_EXPERIENCE = 0.20
W_DIPLOMA    = 0.15
TITLE_FLOOR  = 0.20   # neutral floor for unrelated domains

_DIPLOMA_LEVELS = {"bac": 0, "bac+2": 2, "bac+3": 3, "bac+4": 4, "bac+5": 5, "doctorat": 8,
                   "master": 5, "ingénieur": 5, "ingenieur": 5, "licence": 3, "bts": 2, "dut": 2}


def _diploma_level(d: str | None):
    if not d:
        return None
    s = str(d).strip().lower()
    import re as _re
    m = _re.search(r"bac\s*\+\s*(\d)", s)
    if m:
        return int(m.group(1))
    for key, lvl in _DIPLOMA_LEVELS.items():
        if key in s:
            return lvl
    return None


def _compute_diploma_score(user_diploma: str | None, job_diploma: str | None) -> float:
    u = _diploma_level(user_diploma)
    j = _diploma_level(job_diploma)
    if u is None or j is None:
        return 0.7
    if j <= 0:
        return 1.0
    if u >= j:
        return 1.0
    return round(u / j, 4)

# FR domain → EN/multilingual keywords so cosine works across job-title languages
_DOMAIN_TRANSLATIONS = {
    "développement web":        "web development frontend backend full stack developer",
    "developpement web":        "web development frontend backend full stack developer",
    "développement logiciel":   "software development engineer programmer developer",
    "developpement logiciel":   "software development engineer programmer developer",
    "développement mobile":     "mobile development android ios flutter developer",
    "data & analyse":           "data science analyst engineer machine learning",
    "intelligence artificielle":"artificial intelligence machine learning data scientist",
    "devops & cloud":           "devops cloud engineer infrastructure aws kubernetes",
    "bases de données":         "database administrator sql data engineer",
    "réseaux & sécurité":       "network security cybersecurity engineer",
    "réseaux et sécurité":      "network security cybersecurity engineer",
    "erp & crm":                "erp crm sap consultant functional",
    "outils & méthodes":        "project management agile scrum tools",
}


def _expand_domain(user_domain: str) -> str:
    key = user_domain.strip().lower()
    extra = _DOMAIN_TRANSLATIONS.get(key, "")
    return f"{user_domain} {extra}".strip() if extra else user_domain


# ── Score component helpers ────────────────────────────────────

def _parse_years(years_str: str | None) -> float | None:
    """
    Convert a years_experience string to a float.
    '3'  → 3.0
    '5+' → 5.0
    None / '' → None
    """
    if years_str is None:
        return None
    try:
        return float(str(years_str).replace("+", "").strip())
    except (ValueError, AttributeError):
        return None


def _compute_experience_score(user_years_str: str | None, required_years_str: str | None) -> float:
    """
    - job requires 0-1 yrs AND user has any experience → 1.0
    - user >= required → 1.0
    - either side unknown → 0.7 (neutral)
    - user < required → user/required
    """
    user_years = _parse_years(user_years_str)
    req_years  = _parse_years(required_years_str)

    if user_years is None or req_years is None:
        return 0.7
    if req_years <= 1 and user_years > 0:
        return 1.0
    if req_years <= 0:
        return 0.7
    if user_years >= req_years:
        return 1.0
    return round(user_years / req_years, 4)


def _compute_title_score(user_domain: str | None, job_title: str, job_domain: str | None = None) -> float:
    """
    Domain↔title match. Keyword overlap (cross-language via _expand_domain) → if any
    domain keyword appears in the job title, treat it as a full domain match (1.0).
    Otherwise fall back to cosine similarity with a neutral floor.
    """
    if not user_domain or not job_title:
        return 0.5

    job_text = (job_title + " " + (job_domain or "")).lower()
    keywords = _expand_domain(user_domain).lower().split()
    hits = sum(1 for kw in set(keywords) if len(kw) > 3 and kw in job_text)
    if hits >= 2:
        return 1.0
    if hits == 1:
        return 0.85

    try:
        vecs = encode([_expand_domain(user_domain), job_title if not job_domain else f"{job_title} {job_domain}"])
        sim  = float(np.clip(vecs[0] @ vecs[1], 0.0, 1.0))
        return round(max(sim, TITLE_FLOOR), 4)
    except Exception as exc:
        logger.debug("title_score encoding failed: %s", exc)
        return 0.5


def _batch_title_scores(user_domain: str | None, jobs: list) -> list[float]:
    """
    Title/domain scores for ALL jobs in one encode call.
    Keyword overlap → 1.0 (≥2 hits) / 0.85 (1 hit); else cosine vs user domain.
    """
    n = len(jobs)
    if not user_domain:
        return [0.5] * n

    expanded = _expand_domain(user_domain)
    keywords = {kw for kw in expanded.lower().split() if len(kw) > 3}

    scores: list[float] = [0.0] * n
    cosine_idx, cosine_texts = [], []
    for i, job in enumerate(jobs):
        job_text = (job.title + " " + (getattr(job, "sector", None) or "")).lower()
        hits = sum(1 for kw in keywords if kw in job_text)
        if hits >= 2:
            scores[i] = 1.0
        elif hits == 1:
            scores[i] = 0.85
        else:
            cosine_idx.append(i)
            cosine_texts.append(job.title)

    if cosine_texts:
        try:
            embs = encode([expanded] + cosine_texts, batch_size=256)   # 1 batch call
            uvec = embs[0]
            sims = embs[1:] @ uvec
            for k, i in enumerate(cosine_idx):
                scores[i] = round(max(float(np.clip(sims[k], 0.0, 1.0)), TITLE_FLOOR), 4)
        except Exception as exc:
            logger.debug("batch title encode failed: %s", exc)
            for i in cosine_idx:
                scores[i] = 0.5
    return scores


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

        import time as _time
        _t0 = _time.perf_counter()
        logger.info("[Recs] Batch matching %d jobs...", len(jobs))

        # Component 1 — skill scores for ALL jobs (2 encode calls total)
        skill_results = self.matcher.batch_match(user.skills, jobs)

        # Component 2 — title scores for ALL jobs (1 encode call for all titles)
        title_scores = _batch_title_scores(user.domain, jobs)

        scored: list[dict] = []
        for job, skill_result, title_score in zip(jobs, skill_results, title_scores):
            skill_score = skill_result["score"]
            exp_score   = _compute_experience_score(user.years_experience, job.required_experience)
            dip_score   = _compute_diploma_score(user.diploma, job.required_diploma)

            final = round(
                skill_score * W_SKILL
                + title_score * W_TITLE
                + exp_score   * W_EXPERIENCE
                + dip_score   * W_DIPLOMA,
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
                    "diploma_score":    round(dip_score, 4),
                    "semantic_score":   skill_result["semantic_score"],
                    "keyword_score":    skill_result["keyword_score"],
                    "matching_skills":  matching,
                    "missing_skills":   skill_result["missing_skills"],
                    "explanation":      _build_explanation(
                        final, skill_score, title_score, exp_score, matching
                    ),
                })

        logger.info("[Recs] Batch matching %d jobs... done in %.1fs (was ~45s per-job)",
                    len(jobs), _time.perf_counter() - _t0)

        scored.sort(key=lambda x: x["score"], reverse=True)
        scored = scored[:MAX_RECS]

        logger.info(
            "[Recs] %d matches (threshold=%.2f, scanned=%d)",
            len(scored), SCORE_THRESHOLD, len(jobs),
        )

        # Persist in ONE transaction (bulk insert) — avoids per-row commits
        from app.models.recommendation import Recommendation
        uid = uuid.UUID(user_id)
        db = self.rec_repo.db
        try:
            self.rec_repo.delete_by_user(uid)
            objs = [
                Recommendation(
                    user_id=uid, job_id=e["job"].id, score=e["score"],
                    matching_skills=e["matching_skills"], missing_skills=e["missing_skills"],
                    semantic_score=e["semantic_score"], keyword_score=e["keyword_score"],
                    skill_score=e["skill_score"], title_score=e["title_score"],
                    experience_score=e["experience_score"], diploma_score=e["diploma_score"],
                    explanation=e["explanation"],
                )
                for e in scored
            ]
            db.bulk_save_objects(objs)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("[Recs] Failed to persist: %s", e, exc_info=True)
            raise

        self._save_snapshot(uid, scored)
        return self.get_recommendations(user_id, min_score=0)

    def _save_snapshot(self, user_id: uuid.UUID, scored: list[dict]) -> None:
        from app.models.score_history import ScoreHistory
        scores = [s["score"] for s in scored]
        snap = ScoreHistory(
            user_id=user_id,
            avg_score=round(sum(scores) / len(scores) * 100, 2) if scores else 0.0,
            top_score=round(max(scores) * 100, 2) if scores else 0.0,
            total_matched=len(scored),
        )
        self.rec_repo.db.add(snap)
        self.rec_repo.db.commit()

    def get_history(self, user_id: str) -> list[dict]:
        from app.models.score_history import ScoreHistory
        rows = (
            self.rec_repo.db.query(ScoreHistory)
            .filter(ScoreHistory.user_id == uuid.UUID(user_id))
            .order_by(ScoreHistory.recorded_at.desc())
            .limit(10)
            .all()
        )
        return [
            {
                "avg_score":     r.avg_score,
                "top_score":     r.top_score,
                "total_matched": r.total_matched,
                "recorded_at":   r.recorded_at.isoformat(),
            }
            for r in reversed(rows)
        ]

    def get_recommendations(self, user_id: str, min_score: int = 100) -> list[RecommendationResponse]:
        """Return stored recommendations filtered by min_score. Falls back to suggested if empty."""
        uid  = uuid.UUID(user_id)
        recs = self.rec_repo.get_by_user(uid)

        # Flip is_first_login off on first read
        user = self.user_repo.get_by_id(uid)
        if user and user.is_first_login:
            self.user_repo.update(user, {"is_first_login": False})

        # min_score=100 → ≥0.95 (fuzzy matching never returns exactly 1.0)
        threshold = 0.95 if min_score >= 100 else min_score / 100.0
        filtered = [r for r in recs if (r.score or 0) >= threshold]
        if filtered:
            return [RecommendationResponse.model_validate(r) for r in filtered]

        # No recs at all → suggested jobs so the dashboard is never empty
        if not recs:
            return self._suggested_jobs()

        # Have recs but none meet the threshold → empty list (user can lower min_score)
        return []

    def _suggested_jobs(self) -> list[RecommendationResponse]:
        from datetime import datetime, timezone
        from app.schemas.job import JobResponse
        jobs, _ = self.job_repo.get_all(page=1, size=10)
        out = []
        for job in jobs:
            out.append(RecommendationResponse(
                id=uuid.uuid4(),
                job=JobResponse.model_validate(job),
                score=0.0, skill_score=0.0, title_score=0.0, experience_score=0.0,
                semantic_score=0.0, keyword_score=0.0,
                matching_skills=[], missing_skills=[],
                explanation="Suggestion — complétez votre profil pour un score personnalisé",
                generated_at=datetime.now(timezone.utc),
            ))
        return out


def generate_in_background(user_id: str) -> None:
    """Spawn a thread that generates recommendations with a fresh session + matcher."""
    import threading

    def _work():
        from app.database import SessionLocal
        from app.ai.semantic_matcher import SemanticMatcher
        db = SessionLocal()
        try:
            user = UserRepository(db).get_by_id(uuid.UUID(user_id))
            if user and user.skills:
                RecommendationService(db, SemanticMatcher()).generate(user_id)
        except Exception as e:
            logger.warning("[Recs] background generate failed: %s", e)
        finally:
            db.close()

    threading.Thread(target=_work, daemon=True).start()
