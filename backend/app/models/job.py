"""
Job model — represents a single job posting in the database.

New fields added in Phase 1:
  fingerprint  : SHA-256 hash for duplicate detection (unique constraint)
  scraped_at   : when the scraper collected this job (None for manual entries)
  expires_at   : when to auto-deactivate this listing (None = never)
  updated_at   : auto-updated timestamp on any change
"""
from sqlalchemy import Boolean, Column, String, Text, DateTime, JSON, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    # ── Identity ──────────────────────────────────────────────
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ── Core fields ───────────────────────────────────────────
    title          = Column(String(255), nullable=False, index=True)
    company        = Column(String(255), nullable=False, index=True)
    location       = Column(String(255), nullable=True)
    description    = Column(Text, nullable=False)
    required_skills = Column(JSON, nullable=False, default=list)
    contract_type  = Column(String(50), nullable=True)   # CDI | CDD | Stage | Freelance

    # ── Source / provenance ───────────────────────────────────
    source_name = Column(String(100), nullable=True, index=True)   # "Rekrute" | "Indeed" | "manual"
    source_url  = Column(String(500), nullable=True)               # link to original posting
    scraped_at  = Column(DateTime(timezone=True), nullable=True)   # None for manually entered jobs

    # ── Deduplication ─────────────────────────────────────────
    # SHA-256 of normalise(title)|normalise(company)|normalise(location)
    # Unique constraint prevents inserting the same job twice
    fingerprint = Column(String(64), nullable=True, unique=True)

    # ── Lifecycle ─────────────────────────────────────────────
    deadline   = Column(DateTime(timezone=True), nullable=True)  # application deadline
    expires_at = Column(DateTime(timezone=True), nullable=True)  # when to auto-deactivate
    is_active  = Column(Boolean, default=True, nullable=False)

    # ── Timestamps ────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    saved_by      = relationship("SavedJob",      back_populates="job", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="job", cascade="all, delete-orphan")

    # ── Composite indexes for common query patterns ────────────
    __table_args__ = (
        # Fast lookup: "show me all active Rekrute jobs in Casablanca"
        Index("idx_job_source_active",   "source_name", "is_active"),
        # Fast lookup: "deactivate all expired jobs"
        Index("idx_job_expires_active",  "expires_at",  "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Job {self.id} | {self.title!r} @ {self.company!r}>"
