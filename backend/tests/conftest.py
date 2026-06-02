"""
Shared pytest fixtures for SmartRecruit AI backend tests.

DATABASE
--------
Tests run against the same PostgreSQL database as development
(smartrecruit_db). A separate smartrecruit_test DB is preferred but
requires CREATEDB privilege. To create it manually:

    psql -U postgres -c "CREATE DATABASE smartrecruit_test OWNER smartrecruit;"

Set TEST_DATABASE_URL in your .env to override:
    TEST_DATABASE_URL=postgresql://smartrecruit:smartrecruit_pass@localhost/smartrecruit_test

Falls back to DATABASE_URL if TEST_DATABASE_URL is not set.

ISOLATION
---------
Every test that registers a user gets a unique UUID-suffixed email
address, so tests never collide. No drop_all — test data accumulates
in the DB but never interferes with other tests.

MOCKING
-------
- embedder.warmup   → no-op   (skip sentence-transformer load at startup)
- start_scheduler   → no-op   (no APScheduler background jobs during tests)
- get_matcher       → MockMatcher  (exact keyword match only, no model)

The SemanticMatcher unit tests in test_semantic_matcher.py import
calculate_score() directly and DO use the real model.
"""
import os
import uuid
from unittest.mock import patch

import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.core.dependencies import get_matcher
from app.main import app

# ── Test database URL ──────────────────────────────────────────────────────────
# Use a dedicated test DB when available; fall back to the dev DB.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", settings.DATABASE_URL)

test_engine  = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestSession  = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


# ── Schema setup ───────────────────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """
    Ensure all tables exist before any test runs.

    When using the dev DB the tables already exist (created by Alembic).
    When using a fresh test DB we create them here plus the required
    user_role_enum PostgreSQL type.
    """
    with test_engine.begin() as conn:
        conn.execute(text(
            "DO $$ BEGIN "
            "  CREATE TYPE user_role_enum AS ENUM ('student','recruiter','admin'); "
            "EXCEPTION WHEN duplicate_object THEN null; "
            "END $$;"
        ))
    Base.metadata.create_all(bind=test_engine)
    yield
    # No drop_all — keep tables so dev data is safe.
    # A dedicated test DB can be wiped manually between runs.


# ── Mock matcher ───────────────────────────────────────────────────────────────
class MockMatcher:
    """
    Deterministic test stub — exact keyword overlap only, no ML model.
    Satisfies the SemanticMatcher.match() interface used by the service.
    """
    def match(self, user_skills: list[str], required_skills: list[str]) -> dict:
        if not required_skills:
            return {
                "score": 0.0, "keyword_score": 0.0, "semantic_score": 0.0,
                "matching_skills": [], "fuzzy_matches": {},
                "missing_skills": [], "explanation": "No required skills",
            }
        user_lower = {s.lower() for s in user_skills}
        matched    = [s for s in required_skills if s.lower() in user_lower]
        missing    = [s for s in required_skills if s.lower() not in user_lower]
        score      = round(len(matched) / len(required_skills), 4)
        return {
            "score":           score,
            "keyword_score":   score,
            "semantic_score":  0.0,
            "matching_skills": matched,
            "fuzzy_matches":   {},
            "missing_skills":  missing,
            "explanation":     f"Mock match ({int(score * 100)}%)",
        }


# ── HTTP client (session-scoped → lifespan runs once per test session) ─────────
@pytest.fixture(scope="session")
def client(create_tables):
    """
    FastAPI TestClient shared across the whole test session.

    Overrides get_db to use the test engine and get_matcher to use
    MockMatcher, and patches the startup side-effects that would
    otherwise load the ML model or start background scrapers.
    """
    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db]      = override_get_db
    app.dependency_overrides[get_matcher] = lambda: MockMatcher()

    with (
        patch("app.ai.embedder.warmup"),
        patch("scraper.scheduler.start_scheduler"),
        TestClient(app, raise_server_exceptions=True) as c,
    ):
        yield c

    app.dependency_overrides.clear()


# ── Auth fixtures ──────────────────────────────────────────────────────────────
@pytest.fixture()
def credentials() -> dict:
    """Unique email + password per test function — no register collisions."""
    return {
        "first_name": "Test",
        "last_name":  "User",
        "email":      f"testuser_{uuid.uuid4().hex[:10]}@example.com",
        "password":   "SecurePass123!",
    }


@pytest.fixture()
def registered_user(client, credentials) -> dict:
    """Register a new user and return UserResponse dict + plain-text password."""
    resp = client.post("/api/v1/auth/register", json=credentials)
    assert resp.status_code == 201, f"register failed: {resp.text}"
    return {**resp.json(), "password": credentials["password"]}


@pytest.fixture()
def token(client, registered_user) -> str:
    """Obtain a JWT access token for the registered user."""
    resp = client.post("/api/v1/auth/login", json={
        "email":    registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200, f"login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture()
def auth_headers(token) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── PDF fixture ────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def sample_pdf_bytes() -> bytes:
    """
    Valid PDF containing skill keywords known to be in the taxonomy:
    Python, Django, Flask, PostgreSQL, React, JavaScript.
    Built with PyMuPDF — text is fully extractable by cv_extractor.
    """
    doc  = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (72, 700),
        "John Doe — Software Developer\n"
        "Technical Skills: Python Django Flask PostgreSQL React JavaScript\n"
        "Experience: 3 years in backend web development.",
    )
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes
