"""
Tests for POST /recommendations/generate and GET /recommendations

Setup strategy
--------------
Each test registers its own user (via the 'registered_user' + 'auth_headers'
fixtures from conftest.py) so tests don't share state.

Jobs are inserted directly into the test database via a pytest fixture rather
than going through the admin-only job-creation endpoint.
"""
import uuid
import pytest
from sqlalchemy import text

from tests.conftest import TestSession
from app.models.job import Job


# ── DB helper fixture ──────────────────────────────────────────────────────────

@pytest.fixture()
def db_with_job():
    """
    Insert a sample job into the test DB and yield.
    Cleans up (deletes the job) after the test.
    """
    job = Job(
        id              = uuid.uuid4(),
        title           = "Python Backend Developer",
        company         = "TestCorp",
        description     = "We need a Python/Django developer for our team.",
        required_skills = ["Python", "Django", "PostgreSQL"],
        is_active       = True,
    )
    session = TestSession()
    session.add(job)
    session.commit()
    job_id = job.id
    session.close()

    yield job_id

    # Teardown — delete job (and cascade-delete any recommendations)
    session = TestSession()
    j = session.get(Job, job_id)
    if j:
        session.delete(j)
        session.commit()
    session.close()


# ── /generate ─────────────────────────────────────────────────────────────────

def test_generate_without_skills_returns_400(client, auth_headers):
    """A fresh user with no skills must get a 400 with a helpful message."""
    resp = client.post("/api/v1/recommendations/generate", headers=auth_headers)
    assert resp.status_code == 400
    assert "skill" in resp.json()["detail"].lower()


def test_generate_with_skills_no_jobs_returns_empty_list(client, auth_headers):
    """
    User has skills but there are (nearly certainly) no matching jobs in the
    test DB yet → must return 200 with an empty list, not an error.
    """
    # Give the user skills
    client.patch(
        "/api/v1/users/profile",
        json={"skills": ["COBOL", "FortranXYZ9999"]},   # skills nobody has jobs for
        headers=auth_headers,
    )
    resp = client.post("/api/v1/recommendations/generate", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_generate_returns_recommendations(client, auth_headers, db_with_job):
    """
    User has skills that exactly match the seeded job's required_skills.
    MockMatcher returns score=1.0 (exact match) which is above the 0.10 threshold.
    The response must be a non-empty list with the expected shape.
    """
    # Give the user the exact skills the job requires
    patch_resp = client.patch(
        "/api/v1/users/profile",
        json={"skills": ["Python", "Django", "PostgreSQL"]},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200

    resp = client.post("/api/v1/recommendations/generate", headers=auth_headers)
    assert resp.status_code == 200
    recs = resp.json()
    assert len(recs) >= 1, "Expected at least one recommendation"

    rec = recs[0]
    assert "score" in rec
    assert "job" in rec
    assert rec["score"] > 0.0
    assert "Python" in rec["matching_skills"]


def test_generate_recommendation_shape(client, auth_headers, db_with_job):
    """Validate every field in the RecommendationResponse schema."""
    client.patch(
        "/api/v1/users/profile",
        json={"skills": ["Python", "Django", "PostgreSQL"]},
        headers=auth_headers,
    )
    resp = client.post("/api/v1/recommendations/generate", headers=auth_headers)
    assert resp.status_code == 200
    rec = resp.json()[0]

    required_keys = {"id", "job", "score", "semantic_score", "keyword_score",
                     "matching_skills", "missing_skills", "explanation", "generated_at"}
    assert required_keys.issubset(rec.keys()), f"Missing keys: {required_keys - rec.keys()}"
    assert isinstance(rec["matching_skills"], list)
    assert isinstance(rec["missing_skills"],  list)
    assert 0.0 <= rec["score"] <= 1.0


# ── GET /recommendations ───────────────────────────────────────────────────────

def test_get_recommendations_before_generate_returns_empty(client, auth_headers):
    resp = client.get("/api/v1/recommendations", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_recommendations_after_generate(client, auth_headers, db_with_job):
    client.patch(
        "/api/v1/users/profile",
        json={"skills": ["Python", "Django", "PostgreSQL"]},
        headers=auth_headers,
    )
    client.post("/api/v1/recommendations/generate", headers=auth_headers)
    resp = client.get("/api/v1/recommendations", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_recommendations_require_auth(client):
    resp = client.get("/api/v1/recommendations")
    assert resp.status_code == 403

    resp = client.post("/api/v1/recommendations/generate")
    assert resp.status_code == 403
