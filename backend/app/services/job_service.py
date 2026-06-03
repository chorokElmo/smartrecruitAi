from sqlalchemy.orm import Session
import uuid
import math
from app.repositories.job_repository import JobRepository
from app.schemas.job import JobCreate, JobResponse, JobListResponse
from app.core.exceptions import NotFoundError


class JobService:
    def __init__(self, db: Session):
        self.repo = JobRepository(db)

    def list_jobs(
        self,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        location: str | None = None,
        contract_type: str | None = None,
        sector: str | None = None,
    ) -> JobListResponse:
        items, total = self.repo.get_all(
            page=page,
            size=size,
            search=search,
            location=location,
            contract_type=contract_type,
            sector=sector,
        )
        return JobListResponse(
            items=[JobResponse.model_validate(j) for j in items],
            total=total,
            page=page,
            size=size,
            pages=math.ceil(total / size) if total else 0,
        )

    def get_job(self, job_id: str) -> JobResponse:
        job = self.repo.get_by_id(uuid.UUID(job_id))
        if not job:
            raise NotFoundError("Job")
        return JobResponse.model_validate(job)

    def create_job(self, data: JobCreate) -> JobResponse:
        job = self.repo.create(data)
        return JobResponse.model_validate(job)
