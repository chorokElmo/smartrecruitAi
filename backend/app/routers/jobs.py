from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.job import Job
from app.schemas.job import JobCreate, JobResponse, JobListResponse
from app.services.job_service import JobService
from app.services.saved_job_service import SavedJobService
from app.core.dependencies import get_current_user_id

router = APIRouter()


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    sector: Optional[str] = Query(None, description="Filter by sector: 'private' or 'public'"),
    db: Session = Depends(get_db),
):
    """
    List jobs with optional filters.
    - **search**: full-text search on title, company, description
    - **location**: filter by city
    - **contract_type**: CDI | CDD | Stage | Freelance
    - **sector**: private | public (public sector = emploi-public.ma)
    """
    return JobService(db).list_jobs(
        page=page,
        size=size,
        search=search,
        location=location,
        contract_type=contract_type,
        sector=sector,
    )


@router.get("/count")
def count_jobs(db: Session = Depends(get_db)):
    """Return the total number of active job listings. Used on the frontend dashboard."""
    count = db.query(Job).filter(Job.is_active == True).count()
    return {"count": count}


# ── Saved jobs ── (must be before /{job_id} to avoid route shadowing)

@router.get("/saved", response_model=list[JobResponse])
def get_saved_jobs(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Return all jobs bookmarked by the current user."""
    return SavedJobService(db).get_saved(user_id)


@router.post("/{job_id}/save", response_model=JobResponse, status_code=201)
def save_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Bookmark a job for the current user."""
    return SavedJobService(db).save_job(user_id, job_id)


@router.delete("/{job_id}/save", status_code=204)
def unsave_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Remove a job bookmark for the current user."""
    SavedJobService(db).unsave_job(user_id, job_id)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get a single job by ID."""
    return JobService(db).get_job(job_id)


@router.post("", response_model=JobResponse, status_code=201)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    """Create a job listing (used for seeding / admin)."""
    return JobService(db).create_job(data)
