import uuid

from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ScoreHistory(Base):
    __tablename__ = "score_history"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    avg_score     = Column(Float, nullable=False, default=0.0)
    top_score     = Column(Float, nullable=False, default=0.0)
    total_matched = Column(Integer, nullable=False, default=0)
    recorded_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="score_history")
