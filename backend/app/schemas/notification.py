"""
Notification Pydantic schemas (DTOs).
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id:         uuid.UUID
    user_id:    uuid.UUID
    job_id:     Optional[uuid.UUID] = None
    message:    str
    is_read:    bool
    created_at: datetime

    # Convenience: job title/company so the frontend doesn't need a second request
    job_title:   Optional[str] = None
    job_company: Optional[str] = None

    model_config = {"from_attributes": True}
