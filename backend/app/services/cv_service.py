from fastapi import UploadFile
from sqlalchemy.orm import Session
import uuid

from app.repositories.cv_repository import CVRepository
from app.repositories.user_repository import UserRepository
from app.schemas.cv import CVResponse
from app.utils.file_handler import save_upload
from app.ai.cv_extractor import extract_text_from_pdf
from app.ai.skill_extractor import extract_skills
from app.core.exceptions import NotFoundError


class CVService:
    def __init__(self, db: Session):
        self.cv_repo = CVRepository(db)
        self.user_repo = UserRepository(db)

    async def upload_and_process(self, user_id: str, file: UploadFile) -> CVResponse:
        # 1. Save file to disk
        file_path = await save_upload(file, subfolder="cvs")

        # 2. Create CV record in DB
        cv = self.cv_repo.create(
            user_id=uuid.UUID(user_id),
            file_path=file_path,
            original_name=file.filename or "cv.pdf",
        )

        # 3. Extract text from PDF
        try:
            text = extract_text_from_pdf(file_path)
        except ValueError:
            text = ""

        # 4. Extract skills from text
        skills = extract_skills(text) if text else []

        # 5. Persist extracted data
        cv = self.cv_repo.update_extracted(cv, text=text, skills=skills)

        # 6. Also sync skills to user profile
        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if user:
            merged = list({*user.skills, *skills})
            self.user_repo.update(user, {"skills": merged})

        return CVResponse.model_validate(cv)

    def get_latest(self, user_id: str) -> CVResponse:
        cv = self.cv_repo.get_latest_by_user(uuid.UUID(user_id))
        if not cv:
            raise NotFoundError("CV")
        return CVResponse.model_validate(cv)
