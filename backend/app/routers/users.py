import logging
from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService
from app.services.recommendation_service import RecommendationService
from app.core.dependencies import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Background helper ─────────────────────────────────────────────────────────

def _regenerate_recs_bg(user_id: str, matcher) -> None:
    """Background task: re-run AI matching after a profile update."""
    db = SessionLocal()
    try:
        RecommendationService(db, matcher).generate(user_id)
        logger.info("[Profile] Background recs regenerated for user %s", user_id[:8])
    except Exception as exc:
        logger.warning("[Profile] Background recs failed for %s: %s", user_id[:8], exc)
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/profile", response_model=UserResponse)
def get_profile(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get current user profile."""
    return UserService(db).get_profile(user_id)


@router.patch("/profile", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    background_tasks: BackgroundTasks,
    request: Request,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update profile fields (first_name, last_name, diploma, domain,
    years_experience, skills).  After saving, automatically re-runs the
    AI recommendation engine in the background if the user has skills.
    """
    updated = UserService(db).update_profile(user_id, data)

    # Auto-trigger recommendation regeneration when profile is saved
    matcher = getattr(request.app.state, "matcher", None)
    if matcher and updated.skills:
        background_tasks.add_task(_regenerate_recs_bg, user_id, matcher)

    return updated
