"""
Scraper admin endpoints — ADMIN only.

Morocco-only sources:
  - Rekrute.ma     (private sector)
  - Emploi.ma      (private sector)
  - Tanmia.ma      (private sector)
  - emploi-public.ma (public/government)

Routes:
  GET  /api/v1/scrapers/status         → job counts by source
  GET  /api/v1/scrapers/logs           → last N scraper run logs
  POST /api/v1/scrapers/run/{source}   → trigger a single scraper manually
  POST /api/v1/scrapers/run/all        → trigger all scrapers manually

All POST routes require ADMIN role.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.repositories.job_repository import JobRepository

router = APIRouter()

# Morocco-only scraper registry
_VALID_SOURCES = {"rekrute", "emploi.ma", "tanmia.ma", "emploi-public.ma", "all"}


@router.get(
    "/status",
    summary="Job counts by source",
    response_model=list[dict],
    tags=["Scrapers"],
)
def get_scraper_status(
    db:    Session = Depends(get_db),
    admin: User    = Depends(require_admin),
) -> list[dict]:
    """
    Return the number of total and active jobs for each Moroccan source.
    Requires ADMIN role.
    """
    repo = JobRepository(db)
    return repo.count_by_source()


@router.get(
    "/logs",
    summary="Recent scraper run logs",
    tags=["Scrapers"],
)
def get_scraper_logs(
    limit: int  = 20,
    admin: User = Depends(require_admin),
) -> list[dict]:
    """Return the N most recent scraper run results (newest first). Requires ADMIN role."""
    from scraper.scheduler import get_recent_logs
    limit = min(max(limit, 1), 100)
    return get_recent_logs(limit)


@router.post(
    "/run/{source}",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Manually trigger a Morocco scraper",
    tags=["Scrapers"],
)
def run_scraper(
    source:           str,
    background_tasks: BackgroundTasks,
    admin:            User = Depends(require_admin),
) -> dict:
    """
    Trigger a Moroccan scraper run manually in the background.

    Args:
        source: One of: `rekrute`, `emploi.ma`, `tanmia.ma`, `emploi-public.ma`, `all`

    Returns 202 immediately; check `/scrapers/logs` for results.
    Requires ADMIN role.
    """
    source_lower = source.lower()

    if source_lower not in _VALID_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unknown source '{source}'. "
                f"Valid Morocco sources: {', '.join(sorted(_VALID_SOURCES))}"
            ),
        )

    if source_lower == "all":
        from scraper.scheduler import run_all_scrapers
        background_tasks.add_task(run_all_scrapers)
    else:
        from scraper.scheduler import run_scraper_by_name
        background_tasks.add_task(run_scraper_by_name, source_lower)

    return {
        "message": f"Scrape started for '{source}'. Check /scrapers/logs for results.",
        "source":  source,
    }


@router.get(
    "/sources",
    summary="List job sources present in DB",
    tags=["Scrapers"],
)
def get_sources(
    db: Session = Depends(get_db),
) -> list[str]:
    """
    Return all distinct source_name values for active jobs in the DB.
    Public endpoint — no auth required.
    """
    repo = JobRepository(db)
    return repo.get_distinct_sources()
