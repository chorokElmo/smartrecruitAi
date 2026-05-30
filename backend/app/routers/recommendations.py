from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.core.dependencies import get_current_user_id, get_matcher
from app.ai.semantic_matcher import SemanticMatcher

router = APIRouter()


@router.get("", response_model=list[RecommendationResponse])
def get_recommendations(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Return the current user's stored AI-ranked job recommendations."""
    return RecommendationService(db).get_recommendations(user_id)


@router.post("/generate", response_model=list[RecommendationResponse])
def generate_recommendations(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    matcher: SemanticMatcher = Depends(get_matcher),
):
    """
    Trigger the AI matching engine.
    Scores all active jobs against the user's skills using two-pass
    semantic matching and stores the top results.
    """
    return RecommendationService(db, matcher).generate(user_id)
