import uuid
from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.core.security import verify_password, create_access_token, hash_password
from app.core.exceptions import ConflictError, UnauthorizedError


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    async def register_from_cv(
        self, file, name: str, email: str, password: str,
        domain: str | None = None, diploma: str | None = None,
        years_experience: str | None = None, skills: list[str] | None = None,
    ) -> TokenResponse:
        from app.models.user import User
        from app.models.cv import CV
        from app.utils.file_handler import save_upload
        from app.ai.cv_extractor import extract_text_from_pdf
        from app.ai.llm_extractor import extract_cv_data

        if self.repo.get_by_email(email):
            raise ConflictError("An account with this email already exists")

        file_path = await save_upload(file, subfolder="cvs")
        try:
            text = extract_text_from_pdf(file_path)
        except ValueError:
            text = ""
        extraction = extract_cv_data(text) if text else None

        ex_skills  = extraction.skills           if extraction else []
        ex_diploma = extraction.diploma          if extraction else None
        ex_domain  = extraction.domain           if extraction else None
        ex_exp     = extraction.years_experience if extraction else None

        final_skills = skills if skills else ex_skills
        parts = name.strip().split(" ", 1)
        first_name = parts[0]
        last_name  = parts[1] if len(parts) > 1 else parts[0]

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            hashed_password=hash_password(password),
            skills=final_skills,
            diploma=diploma or ex_diploma,
            domain=domain or ex_domain,
            years_experience=years_experience or ex_exp,
        )
        self.db.add(user)
        self.db.flush()

        cv = CV(
            user_id=user.id,
            file_path=file_path,
            original_name=getattr(file, "filename", None) or "cv.pdf",
            extracted_text=text,
            extracted_skills=ex_skills,
            diploma=ex_diploma,
            domain=ex_domain,
            years_experience=ex_exp,
        )
        self.db.add(cv)
        self.db.commit()
        self.db.refresh(user)

        from app.services.recommendation_service import generate_in_background
        generate_in_background(str(user.id))

        token = create_access_token(subject=str(user.id))
        return TokenResponse(access_token=token)

    def register(self, data: RegisterRequest) -> UserResponse:
        if self.repo.get_by_email(data.email):
            raise ConflictError("An account with this email already exists")
        user = self.repo.create(data)
        from app.services.recommendation_service import generate_in_background
        generate_in_background(str(user.id))
        return UserResponse.model_validate(user)

    async def google_login(self, id_token: str) -> TokenResponse:
        import httpx
        from app.models.user import User
        from app.core.security import hash_password
        from app.core.exceptions import UnauthorizedError
        import secrets

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
            )
        if resp.status_code != 200:
            raise UnauthorizedError("Invalid Google token")
        info = resp.json()

        email = info.get("email")
        if not email or info.get("email_verified") in ("false", False):
            raise UnauthorizedError("Google email not verified")

        user = self.repo.get_by_email(email)
        if not user:
            given  = info.get("given_name") or email.split("@")[0]
            family = info.get("family_name") or given
            user = User(
                first_name=given,
                last_name=family,
                email=email,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                skills=[],
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            from app.services.recommendation_service import generate_in_background
            generate_in_background(str(user.id))

        token = create_access_token(subject=str(user.id))
        return TokenResponse(access_token=token)

    def login(self, data: LoginRequest) -> TokenResponse:
        user = self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        token = create_access_token(subject=str(user.id))
        return TokenResponse(access_token=token)
