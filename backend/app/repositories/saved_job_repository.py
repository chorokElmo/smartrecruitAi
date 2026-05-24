from sqlalchemy.orm import Session, joinedload
from app.models.saved_job import SavedJob
from app.models.job import Job
import uuid


class SavedJobRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_saved_jobs(self, user_id: str) -> list[SavedJob]:
        return (
            self.db.query(SavedJob)
            .options(joinedload(SavedJob.job))
            .filter(SavedJob.user_id == uuid.UUID(user_id))
            .order_by(SavedJob.saved_at.desc())
            .all()
        )

    def is_saved(self, user_id: str, job_id: str) -> bool:
        return (
            self.db.query(SavedJob)
            .filter(
                SavedJob.user_id == uuid.UUID(user_id),
                SavedJob.job_id == uuid.UUID(job_id),
            )
            .first()
            is not None
        )

    def save(self, user_id: str, job_id: str) -> SavedJob:
        entry = SavedJob(
            user_id=uuid.UUID(user_id),
            job_id=uuid.UUID(job_id),
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry

    def unsave(self, user_id: str, job_id: str) -> bool:
        entry = (
            self.db.query(SavedJob)
            .filter(
                SavedJob.user_id == uuid.UUID(user_id),
                SavedJob.job_id == uuid.UUID(job_id),
            )
            .first()
        )
        if not entry:
            return False
        self.db.delete(entry)
        self.db.commit()
        return True
