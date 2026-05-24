from sqlalchemy.orm import Session
from app.models.cv import CV
import uuid


class CVRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_latest_by_user(self, user_id: uuid.UUID) -> CV | None:
        return (
            self.db.query(CV)
            .filter(CV.user_id == user_id)
            .order_by(CV.uploaded_at.desc())
            .first()
        )

    def create(self, user_id: uuid.UUID, file_path: str, original_name: str) -> CV:
        cv = CV(
            user_id=user_id,
            file_path=file_path,
            original_name=original_name,
            extracted_skills=[],
        )
        self.db.add(cv)
        self.db.commit()
        self.db.refresh(cv)
        return cv

    def update_extracted(self, cv: CV, text: str, skills: list[str]) -> CV:
        cv.extracted_text = text
        cv.extracted_skills = skills
        self.db.commit()
        self.db.refresh(cv)
        return cv
