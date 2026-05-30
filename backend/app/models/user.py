"""
User model — represents a registered user.

New field added in Phase 1:
  role : STUDENT | RECRUITER | ADMIN
         Controls what API endpoints the user can access (RBAC).
         Defaults to STUDENT for all new registrations.
"""
import enum
import uuid

from sqlalchemy import Boolean, Column, String, DateTime, JSON, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    """
    Role-based access control (RBAC) levels.

    STUDENT   : default — can upload CVs, view jobs, get recommendations
    RECRUITER : can create and manage job listings
    ADMIN     : full access including scraper monitoring endpoints
    """
    STUDENT   = "student"
    RECRUITER = "recruiter"
    ADMIN     = "admin"


class User(Base):
    __tablename__ = "users"

    # ── Identity ──────────────────────────────────────────────
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ── Profile ───────────────────────────────────────────────
    first_name = Column(String(100), nullable=False)
    last_name  = Column(String(100), nullable=False)
    email      = Column(String(255), unique=True, nullable=False, index=True)
    diploma    = Column(String(255), nullable=True)
    skills     = Column(JSON, nullable=False, default=list)

    # ── Auth ──────────────────────────────────────────────────
    hashed_password = Column(String(255), nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)

    # ── Role ──────────────────────────────────────────────────
    # Stored as a PostgreSQL ENUM type for data integrity
    role = Column(
        # values_callable ensures SQLAlchemy stores/reads the .value ("student")
        # not the .name ("STUDENT") — must match what the migration created
        SAEnum(UserRole, name="user_role_enum", create_type=False,
               values_callable=lambda obj: [e.value for e in obj]),
        default=UserRole.STUDENT,
        nullable=False,
    )

    # ── Timestamps ────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    cvs             = relationship("CV",             back_populates="user", cascade="all, delete-orphan")
    saved_jobs      = relationship("SavedJob",       back_populates="user", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.id} | {self.email!r} | role={self.role}>"
