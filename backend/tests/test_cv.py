"""
Tests for POST /cv/upload and GET /cv/latest
"""
import io
import pytest


# ── Upload ─────────────────────────────────────────────────────────────────────

def test_upload_pdf_returns_201(client, auth_headers, sample_pdf_bytes):
    resp = client.post(
        "/api/v1/cv/upload",
        files={"file": ("my_cv.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text


def test_upload_pdf_returns_cv_fields(client, auth_headers, sample_pdf_bytes):
    resp = client.post(
        "/api/v1/cv/upload",
        files={"file": ("my_cv.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert "extracted_skills" in data
    assert isinstance(data["extracted_skills"], list)
    assert data["original_name"] == "my_cv.pdf"


def test_upload_pdf_extracts_python_skill(client, auth_headers, sample_pdf_bytes):
    """
    The sample PDF contains the word 'Python' which is in the taxonomy.
    After upload the extracted_skills list must include it.
    """
    resp = client.post(
        "/api/v1/cv/upload",
        files={"file": ("cv.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    skills = resp.json()["extracted_skills"]
    assert len(skills) > 0, "Expected at least one skill to be extracted from the PDF"
    assert "Python" in skills, f"Python not found in extracted skills: {skills}"


def test_upload_pdf_syncs_skills_to_user(client, auth_headers, sample_pdf_bytes, token):
    """Skills extracted from the CV must also appear on the user's profile."""
    client.post(
        "/api/v1/cv/upload",
        files={"file": ("cv.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        headers=auth_headers,
    )
    me = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me.status_code == 200
    assert "Python" in me.json()["skills"]


def test_upload_non_pdf_returns_400(client, auth_headers):
    """
    Item 4: content_type validation.
    A plain-text file must be rejected before reaching the service.
    """
    resp = client.post(
        "/api/v1/cv/upload",
        files={"file": ("resume.txt", io.BytesIO(b"I know Python"), "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 400, (
        f"Expected 400 for non-PDF upload, got {resp.status_code}: {resp.text}"
    )
    assert "pdf" in resp.json()["detail"].lower()


def test_upload_requires_auth(client, sample_pdf_bytes):
    resp = client.post(
        "/api/v1/cv/upload",
        files={"file": ("cv.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 403


# ── Latest CV ──────────────────────────────────────────────────────────────────

def test_get_latest_cv_after_upload(client, auth_headers, sample_pdf_bytes):
    client.post(
        "/api/v1/cv/upload",
        files={"file": ("cv.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        headers=auth_headers,
    )
    resp = client.get("/api/v1/cv/latest", headers=auth_headers)
    assert resp.status_code == 200
    assert "id" in resp.json()


def test_get_latest_cv_without_upload_returns_404(client, auth_headers):
    resp = client.get("/api/v1/cv/latest", headers=auth_headers)
    assert resp.status_code == 404
