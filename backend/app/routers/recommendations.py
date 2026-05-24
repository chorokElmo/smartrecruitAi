from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.core.dependencies import get_current_user_id

router = APIRouter()


@router.get("", response_model=list[RecommendationResponse])
def get_recommendations(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Return the current user's AI-ranked job recommendations."""
    return RecommendationService(db).get_recommendations(user_id)


@router.post("/generate", response_model=list[RecommendationResponse])
def generate_recommendations(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Trigger the AI matching engine.
    Scores all active jobs against the user's skills and stores results.
    """
    return RecommendationService(db).generate(user_id)
