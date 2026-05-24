from pydantic import BaseModel
from datetime import datetime
import uuid


class CVResponse(BaseModel):
    id: uuid.UUID
    file_path: str
    original_name: str
    extracted_skills: list[str] = []
    uploaded_at: datetime

    model_config = {"from_attributes": True}
