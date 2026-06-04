"""
Job Pydantic schemas (DTOs).

JobCreate       : body of POST /jobs (scrapers and admin)
JobResponse     : response body for all job endpoints
JobListResponse : paginated list response
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class JobCreate(BaseModel):
    """Fields required to create a job (used by scrapers and the admin API)."""
    title:               str
    company:             str
    location:            Optional[str]      = None
    description:         str                = ""
    required_skills:     list[str]          = []
    required_diploma:    Optional[str]      = None   # LLM-extracted minimum diploma
    required_experience: Optional[str]      = None   # LLM-extracted minimum years
    contract_type:       Optional[str]      = None

    # Source / provenance — set by scrapers, optional for manual entry
    source_name:         Optional[str]      = None
    source_url:          Optional[str]      = None
    scraped_at:          Optional[datetime] = None

    # Deduplication fingerprint — injected by scraper pipeline
    fingerprint:         Optional[str]      = None

    # Sector: "private" (default) | "public" (emploi-public.ma)
    sector:              Optional[str]      = "private"

    # Lifecycle
    deadline:            Optional[datetime] = None
    expires_at:          Optional[datetime] = None

    @field_validator("required_skills", mode="before")
    @classmethod
    def ensure_list(cls, v):
        """Accept None → convert to empty list."""
        return v if isinstance(v, list) else []


class JobResponse(BaseModel):
    """Full job object returned by all job endpoints."""
    id:                  uuid.UUID
    title:               str
    company:             str
    location:            Optional[str]      = None
    description:         str
    required_skills:     list[str]          = []
    required_diploma:    Optional[str]      = None
    required_experience: Optional[str]      = None
    contract_type:       Optional[str]      = None
    deadline:            Optional[datetime] = None

    # Source info — displayed as a badge in the frontend
    source_url:          Optional[str]      = None
    source_name:         Optional[str]      = None
    scraped_at:          Optional[datetime] = None

    # Sector
    sector:              Optional[str]      = "private"

    # Freshness
    expires_at:          Optional[datetime] = None
    is_active:           bool               = True

    # Timestamps
    created_at:          datetime
    updated_at:          Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    """Paginated list of jobs."""
    items: list[JobResponse]
    total: int
    page:  int
    size:  int
    pages: int
