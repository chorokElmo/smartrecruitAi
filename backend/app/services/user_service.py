from sqlalchemy.orm import Session
import uuid
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse, UserUpdate
from app.core.exceptions import NotFoundError


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def get_profile(self, user_id: str) -> UserResponse:
        user = self.repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("User")
        return UserResponse.model_validate(user)

    def update_profile(self, user_id: str, data: UserUpdate) -> UserResponse:
        user = self.repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("User")
        updated = self.repo.update(user, data.model_dump(exclude_none=True))
        return UserResponse.model_validate(updated)
