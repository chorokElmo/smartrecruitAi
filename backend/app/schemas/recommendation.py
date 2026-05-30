from pydantic import BaseModel
from datetime import datetime
from app.schemas.job import JobResponse
import uuid


class RecommendationResponse(BaseModel):
    id:              uuid.UUID
    job:             JobResponse
    score:           float                # combined hybrid score (0.0–1.0)
    semantic_score:  float        = 0.0   # cosine similarity component
    keyword_score:   float        = 0.0   # exact keyword match ratio
    matching_skills: list[str]    = []
    missing_skills:  list[str]    = []
    explanation:     str          = ""    # e.g. "Strong match (82%) — shared skills: Python"
    generated_at:    datetime

    model_config = {"from_attributes": True}
