"""
RecommendationService — AI-powered job matching for a candidate.

Phase 4 upgrade:
  - Two-pass skill matching via SemanticMatcher (singleton, injected from router)
  - Pass 1: exact case-insensitive keyword match
  - Pass 2: semantic fuzzy match on unmatched skills (sentence-transformers)
  - Score = (exact_count + Σ fuzzy_similarities) / total_required  → 0.0–1.0
  - Full result: matching_skills, missing_skills, fuzzy_matches, explanation

PERFORMANCE NOTE
────────────────
  The old batch-encoding approach encoded user + ALL job texts in one huge
  model call (~0.5s for 260 jobs).  The new per-job skill encoding is also
  fast because:
    - Only skill tokens are encoded (10–30 short strings), not full text
    - Batch call covers (R + U) skills, not hundreds of full documents
    - Per-job cost ≈ 5ms → 260 jobs ≈ 1.3s on CPU (acceptable for PFE)
  If latency becomes a concern, add an async task queue (Celery/ARQ).
"""

import uuid
import logging

from sqlalchemy.orm import Session

from app.repositories.recommendation_repository import RecommendationRepository
from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
from app.schemas.recommendation import RecommendationResponse
from app.core.exceptions import BadRequestError

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────
SCORE_THRESHOLD  = 0.10   # minimum combined score to store a recommendation
MAX_JOBS_SCANNED = 500    # cap to avoid scanning 10K+ jobs every request
MAX_RECS         = 30     # store at most this many recommendations per user


class RecommendationService:
    def __init__(self, db: Session, matcher=None):
        """
        Args:
            db:      SQLAlchemy session (injected by FastAPI's get_db).
            matcher: SemanticMatcher singleton from app.state (injected by
                     get_matcher dependency).  Required for generate(); the
                     GET route passes None since it only reads stored results.
        """
        self.rec_repo  = RecommendationRepository(db)
        self.user_repo = UserRepository(db)
        self.job_repo  = JobRepository(db)
        self.matcher   = matcher

    # ── Main: generate recommendations ────────────────────────

    def generate(self, user_id: str) -> list[RecommendationResponse]:
        """
        Run the full AI matching pipeline and persist results.

        Steps:
          1. Load user — raise 400 if not found or has no skills
          2. Fetch up to MAX_JOBS_SCANNED active jobs
          3. For each job: matcher.match(user_skills, job.required_skills)
          4. Filter by SCORE_THRESHOLD, sort descending, keep top MAX_RECS
          5. Delete old recommendations, persist new batch
          6. Return list[RecommendationResponse]

        Raises:
            BadRequestError: user not found or has no skills.
            RuntimeError:    called without a matcher injected.
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
            "[Recs] Generating for user %s… (%d skills)",
            user_id[:8], len(user.skills),
        )

        jobs, _ = self.job_repo.get_all(page=1, size=MAX_JOBS_SCANNED)
        if not jobs:
            return []

        logger.info("[Recs] Scoring %d jobs via two-pass skill matcher", len(jobs))

        # ── Score each job ────────────────────────────────────
        scored: list[dict] = []
        for job in jobs:
            result = self.matcher.match(user.skills, job.required_skills or [])
            final  = result["score"]          # combined 0.0–1.0

            if final >= SCORE_THRESHOLD:
                scored.append({
                    "job":             job,
                    "score":           round(final, 4),
                    "semantic_score":  result["semantic_score"],
                    "keyword_score":   result["keyword_score"],
                    "matching_skills": result["matching_skills"],
                    "missing_skills":  result["missing_skills"],
                    "explanation":     result["explanation"],
                })

        # Sort descending, keep top MAX_RECS
        scored.sort(key=lambda x: x["score"], reverse=True)
        scored = scored[:MAX_RECS]

        logger.info(
            "[Recs] %d matches (threshold=%.2f, scanned=%d)",
            len(scored), SCORE_THRESHOLD, len(jobs),
        )

        # ── Persist: delete old → save new ───────────────────
        saved = []
        try:
            self.rec_repo.delete_by_user(uuid.UUID(user_id))
            for entry in scored:
                rec = self.rec_repo.upsert(
                    user_id        = uuid.UUID(user_id),
                    job_id         = entry["job"].id,
                    score          = entry["score"],
                    matching       = entry["matching_skills"],
                    missing        = entry["missing_skills"],
                    semantic_score = entry["semantic_score"],
                    keyword_score  = entry["keyword_score"],
                    explanation    = entry["explanation"],
                )
                saved.append(RecommendationResponse.model_validate(rec))
        except Exception as e:
            logger.error("[Recs] Failed to persist: %s", e, exc_info=True)
            raise

        return saved

    # ── Read-only ─────────────────────────────────────────────

    def get_recommendations(self, user_id: str) -> list[RecommendationResponse]:
        """Return stored recommendations — no recomputation."""
        recs = self.rec_repo.get_by_user(uuid.UUID(user_id))
        return [RecommendationResponse.model_validate(r) for r in recs]
