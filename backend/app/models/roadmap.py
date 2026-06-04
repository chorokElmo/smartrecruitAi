"""
Roadmap model — stores AI-generated career advice for a user.
One roadmap per user, regenerated at most every 24 hours.
"""
import uuid

from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # one roadmap per user
        index=True,
    )
    content      = Column(Text, nullable=False)   # full AI-generated roadmap text
    generated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    user = relationship("User", back_populates="roadmap")

    def __repr__(self) -> str:
        return f"<Roadmap user={self.user_id} generated={self.generated_at}>"
