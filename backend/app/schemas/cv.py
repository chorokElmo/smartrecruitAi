from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid


class CVResponse(BaseModel):
    id:               uuid.UUID
    file_path:        str
    original_name:    str
    extracted_skills: list[str]       = []
    diploma:          Optional[str]   = None
    domain:           Optional[str]   = None
    years_experience: Optional[str]   = None
    uploaded_at:      datetime

    model_config = {"from_attributes": True}
