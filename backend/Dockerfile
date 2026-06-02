# ─────────────────────────────────────────────────────────────────────────────
# SmartRecruit AI — Backend Dockerfile
#
# Multi-stage build:
#   builder  : installs Python deps (heavy layers cached separately)
#   final    : slim runtime image
#
# Usage:
#   docker build -t smartrecruit-backend .
#   docker run -p 8000:8000 --env-file .env smartrecruit-backend
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools required by some Python packages (psycopg2, lxml…)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libxml2-dev \
        libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.12-slim AS final

WORKDIR /app

# Runtime library dependencies only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libxml2 \
        libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Download spaCy English model
RUN python -m spacy download en_core_web_sm

# Pre-cache sentence-transformers model (~80 MB) so first request is instant.
# SENTENCE_TRANSFORMERS_HOME is set in docker-compose.yml.
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('all-MiniLM-L6-v2'); \
print('sentence-transformers model cached.')"

# Expose the port uvicorn listens on (overridable at runtime via $PORT)
EXPOSE 8000

# Run Alembic migrations then start the server.
# Use sh -c so $PORT from the environment is expanded at runtime.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
