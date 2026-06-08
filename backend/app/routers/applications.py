import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.application import Application, ApplicationStatus
from app.schemas.job import JobResponse
from app.core.dependencies import get_current_user_id

router = APIRouter()


class StatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationResponse(BaseModel):
    id:         uuid.UUID
    status:     ApplicationStatus
    created_at: object
    job:        JobResponse

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ApplicationResponse])
def list_applications(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(Application)
        .options(joinedload(Application.job))
        .filter(Application.user_id == uuid.UUID(user_id))
        .order_by(Application.created_at.desc())
        .all()
    )
    return apps


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
def update_status(
    application_id: str,
    data: StatusUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    app = (
        db.query(Application)
        .options(joinedload(Application.job))
        .filter(
            Application.id == uuid.UUID(application_id),
            Application.user_id == uuid.UUID(user_id),
        )
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = data.status
    db.commit()
    db.refresh(app)
    return app
