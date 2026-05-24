from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class JobCreate(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    description: str
    required_skills: list[str] = []
    contract_type: Optional[str] = None
    deadline: Optional[datetime] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None


class JobResponse(BaseModel):
    id: uuid.UUID
    title: str
    company: str
    location: Optional[str] = None
    description: str
    required_skills: list[str] = []
    contract_type: Optional[str] = None
    deadline: Optional[datetime] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
    page: int
    size: int
    pages: int
