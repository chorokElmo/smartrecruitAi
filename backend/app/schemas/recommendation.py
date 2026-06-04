from pydantic import BaseModel
from datetime import datetime
from app.schemas.job import JobResponse
import uuid


class RecommendationResponse(BaseModel):
    id:               uuid.UUID
    job:              JobResponse
    score:            float           # final weighted score (0.0–1.0)
    skill_score:      float = 0.0    # two-pass skill component (×0.60)
    title_score:      float = 0.0    # domain-title similarity (×0.25)
    experience_score: float = 0.5    # experience fit (×0.15)
    semantic_score:   float = 0.0    # fuzzy sub-score (informational)
    keyword_score:    float = 0.0    # exact sub-score (informational)
    matching_skills:  list[str] = []
    missing_skills:   list[str] = []
    explanation:      str = ""
    generated_at:     datetime

    model_config = {"from_attributes": True}
