import json
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.core.dependencies import get_current_user_id

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account."""
    return AuthService(db).register(data)


@router.post("/register-from-cv", response_model=TokenResponse, status_code=201)
async def register_from_cv(
    cv_file: UploadFile = File(...),
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    domain: Optional[str] = Form(None),
    diploma: Optional[str] = Form(None),
    years_experience: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Create user + CV + skills in one transaction from an uploaded CV. Returns JWT."""
    skill_list = None
    if skills:
        try:
            skill_list = json.loads(skills)
        except json.JSONDecodeError:
            skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    return await AuthService(db).register_from_cv(
        file=cv_file, name=name, email=email, password=password,
        domain=domain, diploma=diploma, years_experience=years_experience,
        skills=skill_list,
    )


@router.post("/extract-cv")
async def extract_cv(cv_file: UploadFile = File(...)):
    """Parse a CV PDF and return extracted fields WITHOUT creating a user."""
    from app.utils.file_handler import save_upload, delete_file
    from app.ai.cv_extractor import extract_text_from_pdf
    from app.ai.llm_extractor import extract_cv_data

    path = await save_upload(cv_file, subfolder="cv_previews")
    try:
        text = extract_text_from_pdf(path)
    except ValueError:
        text = ""
    finally:
        delete_file(path)
    ex = extract_cv_data(text) if text else None
    return {
        "name":             ex.name if ex else None,
        "email":            ex.email if ex else None,
        "skills":           ex.skills if ex else [],
        "diploma":          ex.diploma if ex else None,
        "domain":           ex.domain if ex else None,
        "years_experience": ex.years_experience if ex else None,
    }


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login and receive a JWT access token."""
    return AuthService(db).login(data)


class GoogleAuthRequest(BaseModel):
    id_token: str


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Verify a Google id_token, create the user if new, return a JWT."""
    return await AuthService(db).google_login(data.id_token)


@router.get("/me", response_model=UserResponse)
def me(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Return the currently authenticated user."""
    return UserService(db).get_profile(user_id)
