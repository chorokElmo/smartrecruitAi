from sqlalchemy.orm import Session, joinedload
from app.models.recommendation import Recommendation
import uuid


class RecommendationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user(self, user_id: uuid.UUID, limit: int = 20) -> list[Recommendation]:
        return (
            self.db.query(Recommendation)
            .options(joinedload(Recommendation.job))
            .filter(Recommendation.user_id == user_id)
            .order_by(Recommendation.score.desc())
            .limit(limit)
            .all()
        )

    def upsert(
        self,
        user_id:        uuid.UUID,
        job_id:         uuid.UUID,
        score:          float,
        matching:       list[str],
        missing:        list[str],
        semantic_score: float = 0.0,
        keyword_score:  float = 0.0,
        explanation:    str   = "",
    ) -> Recommendation:
        existing = (
            self.db.query(Recommendation)
            .filter(Recommendation.user_id == user_id, Recommendation.job_id == job_id)
            .first()
        )
        if existing:
            existing.score          = score
            existing.semantic_score = semantic_score
            existing.keyword_score  = keyword_score
            existing.matching_skills = matching
            existing.missing_skills  = missing
            existing.explanation     = explanation
            self.db.commit()
            self.db.refresh(existing)
            return existing

        rec = Recommendation(
            user_id         = user_id,
            job_id          = job_id,
            score           = score,
            semantic_score  = semantic_score,
            keyword_score   = keyword_score,
            matching_skills = matching,
            missing_skills  = missing,
            explanation     = explanation,
        )
        self.db.add(rec)
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def delete_by_user(self, user_id: uuid.UUID) -> None:
        self.db.query(Recommendation).filter(Recommendation.user_id == user_id).delete()
        self.db.commit()
