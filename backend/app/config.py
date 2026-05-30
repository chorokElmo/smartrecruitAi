from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SmartRecruit AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # "development" locally, "production" on Render (set via envVars in render.yaml)
    ENVIRONMENT: str = "development"

    # Database
    # Local default — overridden by DATABASE_URL env var on Render / Neon
    DATABASE_URL: str = "postgresql://smartrecruit:smartrecruit_pass@localhost:5432/smartrecruit_db"

    # JWT
    SECRET_KEY: str = "changethisinproduction"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: list[str] = [".pdf"]

    # CORS — stored as a raw string so pydantic-settings doesn't try to
    # JSON-decode it before we get a chance to parse it ourselves.
    #
    # Accepted formats (all parsed in main.py → _parse_cors_origins):
    #   *                                → allow all (local dev default)
    #   https://yourapp.vercel.app       → single origin
    #   https://a.vercel.app,https://b.vercel.app  → comma-separated
    #   ["https://a.vercel.app"]         → JSON array
    ALLOWED_ORIGINS: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # ignore CI/platform env vars not declared in Settings


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
