from sqlalchemy import Boolean, Column, String, Text, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, nullable=False, default=list)
    contract_type = Column(String(50), nullable=True)  # CDI, CDD, Stage, Freelance
    deadline = Column(DateTime(timezone=True), nullable=True)
    source_url = Column(String(500), nullable=True)
    source_name = Column(String(100), nullable=True)  # ANAPEC, LinkedIn, etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="job", cascade="all, delete-orphan")
