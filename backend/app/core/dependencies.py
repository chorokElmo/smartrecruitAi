"""
FastAPI dependency functions for authentication and authorisation.

Usage in routers:
    # Any authenticated user (returns user_id string)
    user_id: str = Depends(get_current_user_id)

    # Full user object
    user: User = Depends(get_current_user)

    # Admin only
    admin: User = Depends(require_admin)

    # Recruiter or admin
    user: User = Depends(require_recruiter)
"""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()


# ─────────────────────────────────────────────────────────────
# Base auth dependency
# ─────────────────────────────────────────────────────────────

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    Extract the user ID from the JWT Bearer token.
    Returns a UUID string. Raises 401 if token is invalid.
    """
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject claim",
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """
    Fetch the full User object for the authenticated request.
    Raises 401 if the user was deleted after the token was issued.
    """
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated",
        )
    return user


# ─────────────────────────────────────────────────────────────
# Role-based guards
# ─────────────────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Allow ADMIN users only. Raises 403 for everyone else.

    Protects: POST /scrapers/run, GET /scrapers/logs, POST /jobs
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_recruiter(current_user: User = Depends(get_current_user)) -> User:
    """
    Allow RECRUITER or ADMIN users. Raises 403 for STUDENT.

    Protects: POST /jobs (create a job listing)
    """
    if current_user.role not in (UserRole.RECRUITER, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter or admin access required",
        )
    return current_user


# ─────────────────────────────────────────────────────────────
# AI matcher dependency
# ─────────────────────────────────────────────────────────────

def get_matcher(request: Request):
    """
    Return the SemanticMatcher singleton stored on app.state.

    The matcher is created once in the lifespan startup (main.py) and
    shared across all requests — no per-request model loading.

    Usage in routers:
        from app.core.dependencies import get_matcher
        from app.ai.semantic_matcher import SemanticMatcher

        matcher: SemanticMatcher = Depends(get_matcher)
    """
    return request.app.state.matcher
