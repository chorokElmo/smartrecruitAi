from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService
from app.core.dependencies import get_current_user_id

router = APIRouter()


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
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update profile fields (name, diploma, skills)."""
    return UserService(db).update_profile(user_id, data)
