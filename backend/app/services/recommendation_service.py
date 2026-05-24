from sqlalchemy.orm import Session
import uuid

from app.repositories.recommendation_repository import RecommendationRepository
from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
from app.schemas.recommendation import RecommendationResponse
from app.ai.matcher import calculate_score
from app.core.exceptions import BadRequestError


class RecommendationService:
    def __init__(self, db: Session):
        self.rec_repo = RecommendationRepository(db)
        self.user_repo = UserRepository(db)
        self.job_repo = JobRepository(db)

    def generate(self, user_id: str) -> list[RecommendationResponse]:
        """Run the matching engine for all active jobs and persist results."""
        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise BadRequestError("User not found")
        if not user.skills:
            raise BadRequestError("Upload a CV or add skills to your profile first")

        # Delete stale recommendations before regenerating
        self.rec_repo.delete_by_user(uuid.UUID(user_id))

        jobs, _ = self.job_repo.get_all(page=1, size=200)
        results = []
        for job in jobs:
            result = calculate_score(user.skills, job.required_skills)
            if result["score"] > 0:   # only store if at least 1 skill matches
                rec = self.rec_repo.upsert(
                    user_id=uuid.UUID(user_id),
                    job_id=job.id,
                    score=result["score"],
                    matching=result["matching_skills"],
                    missing=result["missing_skills"],
                )
                results.append(RecommendationResponse.model_validate(rec))

        # Sort by score descending
        results.sort(key=lambda r: r.score, reverse=True)
        return results

    def get_recommendations(self, user_id: str) -> list[RecommendationResponse]:
        recs = self.rec_repo.get_by_user(uuid.UUID(user_id))
        return [RecommendationResponse.model_validate(r) for r in recs]
