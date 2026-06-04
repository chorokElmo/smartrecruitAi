from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid


class UserResponse(BaseModel):
    id:               uuid.UUID
    first_name:       str
    last_name:        str
    email:            EmailStr
    diploma:          Optional[str]  = None
    domain:           Optional[str]  = None
    years_experience: Optional[str]  = None
    skills:           list[str]      = []
    created_at:       datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Fields accepted by PATCH /api/v1/users/me"""
    first_name:       Optional[str]       = None
    last_name:        Optional[str]       = None
    diploma:          Optional[str]       = None
    domain:           Optional[str]       = None
    years_experience: Optional[str]       = None
    skills:           Optional[list[str]] = None
