import json
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings


def _parse_cors_origins(raw: str) -> list[str]:
    """
    Parse ALLOWED_ORIGINS from its env-var string into a list for CORSMiddleware.

    Accepts:
      "*"                                   → ["*"]  (local dev)
      "https://myapp.vercel.app"            → ["https://myapp.vercel.app"]
      "https://a.vercel.app,https://b.com"  → ["https://a.vercel.app", "https://b.com"]
      '["https://a.vercel.app"]'            → ["https://a.vercel.app"]  (JSON)
    """
    raw = raw.strip()
    if raw.startswith("["):
        return json.loads(raw)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
import logging

from app.routers import auth, users, jobs, cv, recommendations
from app.routers import scrapers
from scraper.scheduler import start_scheduler, stop_scheduler, schedule_startup_scrape
from scraper.utils import setup_scraper_logging
from app.ai.embedder import warmup as embedder_warmup
from app.ai.semantic_matcher import SemanticMatcher
from app.database import SessionLocal
from app.models.job import Job

_startup_logger = logging.getLogger("app.startup")


def _auto_populate() -> int:
    """
    Check the jobs table on startup.
    - If empty  → seed 12 demo jobs, then schedule a Rekrute quick-scrape.
    - If < 50   → schedule a Rekrute quick-scrape to enrich the DB.
    - If >= 50  → nothing to do.

    Returns the active job count BEFORE any seeding (0 means fresh install).
    """
    db = SessionLocal()
    try:
        count = db.query(Job).filter(Job.is_active == True).count()
    finally:
        db.close()

    if count == 0:
        _startup_logger.info(
            "[Auto-populate] Jobs table is empty — seeding 12 demo jobs…"
        )
        try:
            # Import here to avoid circular-import issues at module level
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from seed_jobs import seed as _seed
            _seed()
            _startup_logger.info("[Auto-populate] Seeding complete.")
        except Exception as e:
            _startup_logger.error(f"[Auto-populate] Seeding failed: {e}", exc_info=True)

    if count < 50:
        _startup_logger.info(
            f"[Auto-populate] {count} active jobs found (< 50) — "
            "scheduling one-time Rekrute scrape (3 pages)…"
        )
        schedule_startup_scrape()
    else:
        _startup_logger.info(f"[Auto-populate] {count} active jobs in DB — no action needed.")

    return count


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.

    On startup:
      1. Configure scraper logging
      2. Pre-load the sentence-transformers model (avoid delay on first request)
      3. Create the SemanticMatcher singleton (shared across all requests)
      4. Start APScheduler (scrapes every 6h, expires jobs hourly)
      5. Auto-populate: seed + quick-scrape if DB is empty or sparse
    On shutdown:
      6. Gracefully stop APScheduler
    """
    setup_scraper_logging()
    embedder_warmup()                       # pre-load all-MiniLM-L6-v2 model
    app.state.matcher = SemanticMatcher()   # singleton — one instance for the app
    start_scheduler()
    _auto_populate()                        # seed + scrape if jobs table is sparse

    yield   # ← app runs here

    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered recruitment platform for Moroccan job seekers",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Local dev: ALLOWED_ORIGINS defaults to "*" → _parse_cors_origins → ["*"].
    # Production: set ALLOWED_ORIGINS=https://yourapp.vercel.app in Render.
    allow_origins=_parse_cors_origins(settings.ALLOWED_ORIGINS),
    allow_credentials=False,   # JWT is in Authorization header, not a cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

prefix = settings.API_V1_PREFIX
app.include_router(auth.router,            prefix=f"{prefix}/auth",            tags=["Auth"])
app.include_router(users.router,           prefix=f"{prefix}/users",           tags=["Users"])
app.include_router(jobs.router,            prefix=f"{prefix}/jobs",            tags=["Jobs"])
app.include_router(cv.router,              prefix=f"{prefix}/cv",              tags=["CV"])
app.include_router(recommendations.router, prefix=f"{prefix}/recommendations", tags=["Recommendations"])
app.include_router(scrapers.router,        prefix=f"{prefix}/scrapers",        tags=["Scrapers"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
