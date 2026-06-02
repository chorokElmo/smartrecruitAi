"""
Tests for POST /auth/register, POST /auth/login, GET /auth/me
"""
import pytest


# ── Register ───────────────────────────────────────────────────────────────────

def test_register_returns_201_and_user_fields(client, credentials):
    resp = client.post("/api/v1/auth/register", json=credentials)
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == credentials["email"]
    assert data["first_name"] == credentials["first_name"]
    assert data["last_name"] == credentials["last_name"]
    assert "id" in data
    assert "hashed_password" not in data   # must never be exposed


def test_register_duplicate_email_returns_409(client, credentials):
    # First registration succeeds
    client.post("/api/v1/auth/register", json=credentials)
    # Second registration with the same email must fail
    resp = client.post("/api/v1/auth/register", json=credentials)
    assert resp.status_code == 409
    assert "email" in resp.json()["detail"].lower() or "exists" in resp.json()["detail"].lower()


def test_register_missing_fields_returns_422(client):
    resp = client.post("/api/v1/auth/register", json={"email": "a@b.com"})
    assert resp.status_code == 422   # Pydantic validation error


def test_register_invalid_email_returns_422(client):
    resp = client.post("/api/v1/auth/register", json={
        "first_name": "A", "last_name": "B",
        "email": "not-an-email", "password": "pass"
    })
    assert resp.status_code == 422


# ── Login ──────────────────────────────────────────────────────────────────────

def test_login_returns_access_token(client, registered_user):
    resp = client.post("/api/v1/auth/login", json={
        "email":    registered_user["email"],
        "password": registered_user["password"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 20   # sanity-check it's a real JWT


def test_login_wrong_password_returns_401(client, registered_user):
    resp = client.post("/api/v1/auth/login", json={
        "email":    registered_user["email"],
        "password": "wrong_password",
    })
    assert resp.status_code == 401


def test_login_unknown_email_returns_401(client):
    resp = client.post("/api/v1/auth/login", json={
        "email": "nobody@nowhere.com", "password": "irrelevant"
    })
    assert resp.status_code == 401


# ── /me ────────────────────────────────────────────────────────────────────────

def test_me_returns_current_user(client, registered_user, auth_headers):
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == registered_user["email"]
    assert data["id"]    == registered_user["id"]


def test_me_no_token_returns_403(client):
    resp = client.get("/api/v1/auth/me")
    # FastAPI HTTPBearer returns 403 when no Authorization header is present
    assert resp.status_code == 403


def test_me_invalid_token_returns_401(client):
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer notavalidtoken"})
    assert resp.status_code == 401
