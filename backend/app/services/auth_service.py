from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.core.security import verify_password, create_access_token
from app.core.exceptions import ConflictError, UnauthorizedError


class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register(self, data: RegisterRequest) -> UserResponse:
        if self.repo.get_by_email(data.email):
            raise ConflictError("An account with this email already exists")
        user = self.repo.create(data)
        return UserResponse.model_validate(user)

    def login(self, data: LoginRequest) -> TokenResponse:
        user = self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        token = create_access_token(subject=str(user.id))
        return TokenResponse(access_token=token)
