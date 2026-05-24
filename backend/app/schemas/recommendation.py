from pydantic import BaseModel
from datetime import datetime
from app.schemas.job import JobResponse
import uuid


class RecommendationResponse(BaseModel):
    id: uuid.UUID
    job: JobResponse
    score: float
    matching_skills: list[str] = []
    missing_skills: list[str] = []
    generated_at: datetime

    model_config = {"from_attributes": True}
