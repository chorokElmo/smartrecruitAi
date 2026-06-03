"""
NotificationRepository — all DB operations for the Notification model.
"""
import uuid
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.notification import Notification
from app.models.job import Job


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_user(self, user_id: uuid.UUID, limit: int = 30) -> list[Notification]:
        """Return the most recent notifications for a user, newest first."""
        return (
            self.db.query(Notification)
            .options(joinedload(Notification.job))   # eager-load job for title/company
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

    def count_unread(self, user_id: uuid.UUID) -> int:
        """Count unread notifications for a user — used by the bell badge."""
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .count()
        )

    def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Notification]:
        """Mark a single notification as read. Returns None if not found / not owned."""
        notif = (
            self.db.query(Notification)
            .filter(
                Notification.id      == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if notif:
            notif.is_read = True
            self.db.commit()
            self.db.refresh(notif)
        return notif

    def mark_all_read(self, user_id: uuid.UUID) -> int:
        """Mark all unread notifications as read. Returns the number updated."""
        count = (
            self.db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .update({"is_read": True}, synchronize_session="fetch")
        )
        self.db.commit()
        return count

    def exists_today(self, user_id: uuid.UUID, job_id: uuid.UUID) -> bool:
        """
        Check if a notification for this (user, job) pair was already created today.
        Prevents the daily scheduler from creating duplicate notifications.
        """
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        return (
            self.db.query(Notification.id)
            .filter(
                Notification.user_id   == user_id,
                Notification.job_id    == job_id,
                Notification.created_at >= today,
            )
            .first()
        ) is not None

    def create(
        self,
        user_id: uuid.UUID,
        job_id:  Optional[uuid.UUID],
        message: str,
    ) -> Notification:
        """Insert a new notification and return it."""
        notif = Notification(
            user_id=user_id,
            job_id=job_id,
            message=message,
            is_read=False,
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)
        return notif
