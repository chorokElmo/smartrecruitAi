from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings

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

# Serve uploaded files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers are registered here in Phase 2
# from app.routers import auth, users, jobs, cv, recommendations
# app.include_router(auth.router,            prefix=f"{settings.API_V1_PREFIX}/auth",            tags=["Auth"])
# app.include_router(users.router,           prefix=f"{settings.API_V1_PREFIX}/users",           tags=["Users"])
# app.include_router(jobs.router,            prefix=f"{settings.API_V1_PREFIX}/jobs",            tags=["Jobs"])
# app.include_router(cv.router,              prefix=f"{settings.API_V1_PREFIX}/cv",              tags=["CV"])
# app.include_router(recommendations.router, prefix=f"{settings.API_V1_PREFIX}/recommendations", tags=["Recommendations"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
