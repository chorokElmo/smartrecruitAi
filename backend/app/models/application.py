"""
Application model — tracks which jobs a user has marked as "Applied".
One record per (user, job) pair.
"""
import uuid
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Application(Base):
    __tablename__ = "applications"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id     = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"),  nullable=False, index=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_application_user_job"),)

    user = relationship("User", back_populates="applications")
    job  = relationship("Job",  back_populates="applications")
