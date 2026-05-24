from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cv import CVResponse
from app.services.cv_service import CVService
from app.core.dependencies import get_current_user_id

router = APIRouter()


@router.post("/upload", response_model=CVResponse, status_code=201)
async def upload_cv(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Upload a PDF CV.
    - Saves the file
    - Extracts text with PyMuPDF
    - Detects skills from taxonomy
    - Syncs skills to user profile
    """
    return await CVService(db).upload_and_process(user_id, file)


@router.get("/latest", response_model=CVResponse)
def get_latest_cv(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get the most recently uploaded CV for the current user."""
    return CVService(db).get_latest(user_id)
