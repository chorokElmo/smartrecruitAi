from fastapi import UploadFile
from sqlalchemy.orm import Session
import uuid

from app.repositories.cv_repository import CVRepository
from app.repositories.user_repository import UserRepository
from app.schemas.cv import CVResponse
from app.utils.file_handler import save_upload
from app.ai.cv_extractor import extract_text_from_pdf
from app.ai.llm_extractor import extract_cv_data
from app.core.exceptions import NotFoundError


class CVService:
    def __init__(self, db: Session):
        self.cv_repo   = CVRepository(db)
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

        # 4. Extract structured data — LLM first, regex fallback inside extract_cv_data
        extraction = extract_cv_data(text) if text else None

        skills           = extraction.skills           if extraction else []
        diploma          = extraction.diploma           if extraction else None
        domain           = extraction.domain            if extraction else None
        years_experience = extraction.years_experience  if extraction else None

        # 5. Persist extracted data
        cv = self.cv_repo.update_extracted(
            cv,
            text=text,
            skills=skills,
            diploma=diploma,
            domain=domain,
            years_experience=years_experience,
        )

        # 6. Sync richer data to user profile (never overwrite existing non-null values)
        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if user:
            merged_skills = list({*user.skills, *skills})
            updates: dict = {"skills": merged_skills}
            if diploma          and not user.diploma:          updates["diploma"]          = diploma
            if domain           and not user.domain:           updates["domain"]           = domain
            if years_experience and not user.years_experience: updates["years_experience"] = years_experience
            self.user_repo.update(user, updates)

        return CVResponse.model_validate(cv)

    def get_latest(self, user_id: str) -> CVResponse:
        cv = self.cv_repo.get_latest_by_user(uuid.UUID(user_id))
        if not cv:
            raise NotFoundError("CV")
        return CVResponse.model_validate(cv)
