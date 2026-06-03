"""
Notifications router.

GET  /api/v1/notifications           — list current user's notifications
GET  /api/v1/notifications/unread-count — { count: int } for bell badge
PATCH /api/v1/notifications/{id}/read  — mark one notification as read
PATCH /api/v1/notifications/read-all   — mark all as read
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user_id
from app.repositories.notification_repository import NotificationRepository
from app.schemas.notification import NotificationResponse

router = APIRouter()


def _to_response(n) -> NotificationResponse:
    """Convert a Notification ORM object to the response schema."""
    return NotificationResponse(
        id=n.id,
        user_id=n.user_id,
        job_id=n.job_id,
        message=n.message,
        is_read=n.is_read,
        created_at=n.created_at,
        job_title=n.job.title   if n.job else None,
        job_company=n.job.company if n.job else None,
    )


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    limit: int = 30,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Return the most recent notifications for the authenticated user."""
    repo = NotificationRepository(db)
    notifs = repo.get_for_user(uuid.UUID(user_id), limit=limit)
    return [_to_response(n) for n in notifs]


@router.get("/unread-count")
def unread_count(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Return the number of unread notifications — used by the bell badge."""
    repo = NotificationRepository(db)
    return {"count": repo.count_unread(uuid.UUID(user_id))}


@router.patch("/read-all", status_code=200)
def mark_all_read(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    repo = NotificationRepository(db)
    updated = repo.mark_all_read(uuid.UUID(user_id))
    return {"updated": updated}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    repo = NotificationRepository(db)
    notif = repo.mark_read(uuid.UUID(notification_id), uuid.UUID(user_id))
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _to_response(notif)
