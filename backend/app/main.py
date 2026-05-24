from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import auth, users, jobs

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered recruitment platform for Moroccan job seekers",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded CV files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ─── API Routers ──────────────────────────────────────
prefix = settings.API_V1_PREFIX

app.include_router(auth.router,  prefix=f"{prefix}/auth",  tags=["Auth"])
app.include_router(users.router, prefix=f"{prefix}/users", tags=["Users"])
app.include_router(jobs.router,  prefix=f"{prefix}/jobs",  tags=["Jobs"])
# Phase 3:
# app.include_router(cv.router,              prefix=f"{prefix}/cv",              tags=["CV"])
# app.include_router(recommendations.router, prefix=f"{prefix}/recommendations", tags=["Recommendations"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
