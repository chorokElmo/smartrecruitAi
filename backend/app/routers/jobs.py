from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas.job import JobCreate, JobResponse, JobListResponse
from app.services.job_service import JobService

router = APIRouter()


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    List jobs with optional filters.
    - **search**: full-text search on title, company, description
    - **location**: filter by city
    - **contract_type**: CDI | CDD | Stage | Freelance
    """
    return JobService(db).list_jobs(
        page=page,
        size=size,
        search=search,
        location=location,
        contract_type=contract_type,
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get a single job by ID."""
    return JobService(db).get_job(job_id)


@router.post("", response_model=JobResponse, status_code=201)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    """Create a job listing (used for seeding / admin)."""
    return JobService(db).create_job(data)
