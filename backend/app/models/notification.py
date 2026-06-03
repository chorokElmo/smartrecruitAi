"""
Notification model — deadline alerts for public-sector jobs.

Created when the daily scheduler finds a public job whose deadline is
within 3 days AND the job appears in a user's recommendations.

Fields:
    user_id     FK → users.id
    job_id      FK → jobs.id  (nullable — allows system-level messages)
    message     Human-readable alert text
    is_read     False until the user opens the bell dropdown
    created_at  Auto-set server-side
"""
import uuid

from sqlalchemy import Boolean, Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=True,   # NULL for system-level messages without a specific job
    )

    message  = Column(Text, nullable=False)
    is_read  = Column(Boolean, nullable=False, default=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────
    user = relationship("User", back_populates="notifications")
    job  = relationship("Job",  back_populates="notifications")

    def __repr__(self) -> str:
        status = "read" if self.is_read else "unread"
        return f"<Notification {self.id} | user={self.user_id} | {status}>"
