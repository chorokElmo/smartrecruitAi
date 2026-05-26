import uuid
from sqlalchemy.orm import Session
from app.repositories.saved_job_repository import SavedJobRepository
from app.repositories.job_repository import JobRepository
from app.core.exceptions import NotFoundError, ConflictError


class SavedJobService:
    def __init__(self, db: Session):
        self.repo = SavedJobRepository(db)
        self.job_repo = JobRepository(db)

    def get_saved(self, user_id: str):
        entries = self.repo.get_saved_jobs(user_id)
        return [entry.job for entry in entries]

    def save_job(self, user_id: str, job_id: str):
        job = self.job_repo.get_by_id(uuid.UUID(job_id))  # fix: pass UUID, not str
        if not job:
            raise NotFoundError("Job not found")
        if self.repo.is_saved(user_id, job_id):
            raise ConflictError("Job already saved")
        self.repo.save(user_id, job_id)
        return job

    def unsave_job(self, user_id: str, job_id: str):
        removed = self.repo.unsave(user_id, job_id)
        if not removed:
            raise NotFoundError("Saved job not found")
