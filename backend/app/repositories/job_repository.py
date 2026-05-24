from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.job import Job
from app.schemas.job import JobCreate
import uuid
import math


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, job_id: uuid.UUID) -> Job | None:
        return self.db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()

    def get_all(
        self,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        location: str | None = None,
        contract_type: str | None = None,
    ) -> tuple[list[Job], int]:
        query = self.db.query(Job).filter(Job.is_active == True)

        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    Job.title.ilike(term),
                    Job.company.ilike(term),
                    Job.description.ilike(term),
                )
            )
        if location:
            query = query.filter(Job.location.ilike(f"%{location}%"))
        if contract_type:
            query = query.filter(Job.contract_type == contract_type)

        total = query.count()
        items = query.order_by(Job.created_at.desc()).offset((page - 1) * size).limit(size).all()
        return items, total

    def create(self, data: JobCreate) -> Job:
        job = Job(**data.model_dump())
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def bulk_create(self, jobs: list[dict]) -> int:
        objs = [Job(**j) for j in jobs]
        self.db.bulk_save_objects(objs)
        self.db.commit()
        return len(objs)
