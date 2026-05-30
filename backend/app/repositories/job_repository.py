"""
JobRepository — all database operations for the Job model.

Changes in Phase 1:
  - get_all() now accepts `sources` filter (list of source_name values)
  - Added get_by_fingerprint() for deduplication
  - Added deactivate_expired() for freshness management
  - Added count_by_source() for admin monitoring
"""
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import or_, func, Integer, case
from sqlalchemy.orm import Session

from app.models.job import Job
from app.schemas.job import JobCreate


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    # ── Single-job lookups ────────────────────────────────────

    def get_by_id(self, job_id: uuid.UUID) -> Optional[Job]:
        """Fetch one active job by its UUID primary key."""
        return (
            self.db.query(Job)
            .filter(Job.id == job_id, Job.is_active == True)
            .first()
        )

    def get_by_fingerprint(self, fingerprint: str) -> Optional[Job]:
        """
        Find a job by its SHA-256 deduplication fingerprint.
        Used by the scraper to check for duplicates before inserting.
        """
        return (
            self.db.query(Job)
            .filter(Job.fingerprint == fingerprint)
            .first()
        )

    # ── Paginated listing ─────────────────────────────────────

    def get_all(
        self,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
        location: Optional[str] = None,
        contract_type: Optional[str] = None,
        sources: Optional[list[str]] = None,    # NEW: filter by source_name
    ) -> tuple[list[Job], int]:
        """
        Return a paginated list of active jobs with optional filters.

        Args:
            page:          1-based page number
            size:          number of results per page
            search:        full-text search on title, company, description
            location:      partial match on location field
            contract_type: exact match on contract type
            sources:       list of source_name values, e.g. ["Rekrute", "Indeed"]
                           If None or empty, all sources are returned.

        Returns:
            (items, total) — list of Job objects + total matching count
        """
        query = self.db.query(Job).filter(Job.is_active == True)

        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    Job.title.ilike(term),
                    Job.company.ilike(term),
                    Job.description.ilike(term),
                )
            )
        if location:
            query = query.filter(Job.location.ilike(f"%{location}%"))

        if contract_type:
            query = query.filter(Job.contract_type == contract_type)

        # Source filter: ?sources=Rekrute,Indeed  →  WHERE source_name IN ('Rekrute','Indeed')
        if sources:
            query = query.filter(Job.source_name.in_(sources))

        total = query.count()
        items = (
            query
            .order_by(Job.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )
        return items, total

    # ── Write operations ──────────────────────────────────────

    def create(self, data: JobCreate) -> Job:
        """Insert a new job and return the persisted object (with generated ID)."""
        job = Job(**data.model_dump())
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def bulk_create(self, jobs: list[dict]) -> int:
        """
        Insert multiple jobs at once.
        Returns the count of rows inserted.

        Note: does NOT refresh objects — if you need their IDs, use create() individually.
        """
        objs = [Job(**j) for j in jobs]
        self.db.bulk_save_objects(objs)
        self.db.commit()
        return len(objs)

    # ── Freshness management ──────────────────────────────────

    def deactivate_expired(self) -> int:
        """
        Set is_active = False for all jobs whose expires_at is in the past.

        Called by the scheduler every hour to keep listings fresh.

        Returns:
            Number of jobs deactivated.
        """
        now = datetime.now(timezone.utc)
        updated = (
            self.db.query(Job)
            .filter(
                Job.expires_at != None,
                Job.expires_at < now,
                Job.is_active == True,
            )
            .update({"is_active": False}, synchronize_session="fetch")
        )
        self.db.commit()
        return updated

    # ── Admin / monitoring helpers ────────────────────────────

    def count_by_source(self) -> list[dict]:
        """
        Return job counts grouped by source_name.

        Example return:
            [
                {"source": "Rekrute", "total": 342, "active": 289},
                {"source": "Indeed",  "total": 120, "active": 98},
                {"source": "manual",  "total": 15,  "active": 15},
            ]

        Used by GET /api/v1/scrapers/status.
        """
        rows = (
            self.db.query(
                Job.source_name,
                func.count(Job.id).label("total"),
                # SUM(CASE WHEN is_active THEN 1 ELSE 0 END) — works on all DBs
                func.sum(case((Job.is_active == True, 1), else_=0)).label("active"),
            )
            .group_by(Job.source_name)
            .all()
        )
        return [
            {
                "source": row.source_name or "manual",
                "total":  row.total,
                "active": int(row.active or 0),
            }
            for row in rows
        ]

    def get_distinct_sources(self) -> list[str]:
        """
        Return all distinct source_name values in the DB.
        Used to populate the frontend source filter dropdown.
        """
        rows = (
            self.db.query(Job.source_name)
            .filter(Job.source_name != None, Job.is_active == True)
            .distinct()
            .all()
        )
        return [r.source_name for r in rows if r.source_name]
