"""
Scraper admin endpoints — ADMIN only.

Routes:
  GET  /api/v1/scrapers/status         → job counts by source
  GET  /api/v1/scrapers/logs           → last N scraper run logs
  POST /api/v1/scrapers/run/{source}   → trigger a single scraper manually
  POST /api/v1/scrapers/run/all        → trigger all scrapers manually

All routes require ADMIN role (protected by require_admin dependency).

Usage in Swagger:
  1. Login as admin → copy the JWT token
  2. Click "Authorize" → paste "Bearer <token>"
  3. POST /scrapers/run/remoteok  → kicks off a live scrape
  4. GET  /scrapers/logs          → see the result
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.repositories.job_repository import JobRepository

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# Status — job counts by source
# ─────────────────────────────────────────────────────────────

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
    Return the number of total and active jobs for each source.

    Example response:
    ```json
    [
      {"source": "Rekrute",  "total": 342, "active": 289},
      {"source": "RemoteOK", "total": 120, "active": 98},
      {"source": "manual",   "total": 15,  "active": 15}
    ]
    ```

    Requires ADMIN role.
    """
    repo = JobRepository(db)
    return repo.count_by_source()


# ─────────────────────────────────────────────────────────────
# Logs — last N scraper run results
# ─────────────────────────────────────────────────────────────

@router.get(
    "/logs",
    summary="Recent scraper run logs",
    tags=["Scrapers"],
)
def get_scraper_logs(
    limit: int  = 20,
    admin: User = Depends(require_admin),
) -> list[dict]:
    """
    Return the N most recent scraper run results (newest first).

    Each entry includes:
    - source, started_at, finished_at, duration_seconds
    - jobs_found, jobs_added, jobs_skipped
    - errors: list of error messages
    - success: True if no errors occurred

    Args:
        limit: Number of log entries to return (default 20, max 100)

    Requires ADMIN role.
    """
    from scraper.scheduler import get_recent_logs
    limit = min(max(limit, 1), 100)
    return get_recent_logs(limit)


# ─────────────────────────────────────────────────────────────
# Run — trigger a scraper manually (background task)
# ─────────────────────────────────────────────────────────────

_VALID_SOURCES = {"remoteok", "rekrute", "emploi.ma", "indeed", "all"}


@router.post(
    "/run/{source}",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Manually trigger a scraper",
    tags=["Scrapers"],
)
def run_scraper(
    source:           str,
    background_tasks: BackgroundTasks,
    admin:            User = Depends(require_admin),
) -> dict:
    """
    Trigger a scraper run manually in the background.

    The request returns immediately with 202 Accepted.
    The scraper runs asynchronously — check `/scrapers/logs` for results.

    Args:
        source: One of: `remoteok`, `rekrute`, `emploi.ma`, `indeed`, `all`

    Returns:
        `{"message": "Scrape started for {source}", "source": "{source}"}`

    Raises:
        400 if the source name is not recognised.

    Requires ADMIN role.
    """
    source_lower = source.lower()

    if source_lower not in _VALID_SOURCES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unknown source '{source}'. "
                f"Valid options: {', '.join(sorted(_VALID_SOURCES))}"
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


# ─────────────────────────────────────────────────────────────
# Sources — list available source names (for frontend dropdown)
# ─────────────────────────────────────────────────────────────

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

    Used by the frontend to populate the source filter dropdown.
    This endpoint is PUBLIC (no auth required) — it reveals no sensitive data.

    Example: ["Rekrute", "RemoteOK", "Emploi.ma", "manual"]
    """
    repo = JobRepository(db)
    return repo.get_distinct_sources()
