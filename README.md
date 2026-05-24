# SmartRecruit AI

**Intelligent Recruitment Monitoring and Recommendation Platform**

> Bachelor Final Year Project (PFE) — AI-powered platform that centralizes Moroccan job opportunities, extracts skills from CVs, and matches candidates with positions using NLP.

---

## Overview

SmartRecruit AI solves a real problem: Moroccan students waste hours searching fragmented portals (ANAPEC, company sites, university boards) for internships and jobs. This platform centralizes opportunities and uses AI to match candidates based on their actual skills.

### Key Features

- **CV Skill Extraction** — Upload a PDF CV; spaCy + Sentence Transformers extract your skills automatically
- **Compatibility Scoring** — Each job shows a percentage match based on your skill profile
- **Missing Skills Analysis** — See exactly which skills you need to improve your score
- **Smart Recommendations** — AI-ranked job feed personalized to your profile
- **Job Aggregation** — Centralized listings from multiple Moroccan sources

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion |
| Backend | FastAPI, Python 3.11, SQLAlchemy, Pydantic v2 |
| Database | PostgreSQL 15 |
| AI / NLP | spaCy, Sentence Transformers, scikit-learn |
| PDF Processing | PyMuPDF (fitz) |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## Project Structure

```
smartrecruit-ai/
├── backend/          # FastAPI application
├── frontend/         # Next.js 15 application
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Run with Docker (recommended)

```bash
cp backend/.env.example backend/.env
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### Run locally

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## API Documentation

Interactive docs available at `/docs` (Swagger UI) and `/redoc` when the backend is running.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login, returns JWT |
| GET | `/api/v1/jobs` | List jobs with filters |
| POST | `/api/v1/cv/upload` | Upload PDF CV |
| GET | `/api/v1/recommendations` | AI-ranked job matches |

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for full system design including:
- Layered backend architecture (Router → Service → Repository → Model)
- AI matching pipeline
- ER diagram
- Sequence diagrams

---

## Development Roadmap

- [x] Phase 1 — Architecture & Design
- [ ] Phase 2 — Backend & Auth
- [ ] Phase 3 — AI / CV Engine
- [ ] Phase 4 — Frontend
- [ ] Phase 5 — Testing & Deployment

---

## Author

**SmartRecruit AI** — PFE Bachelor Project  
Built with FastAPI + Next.js + spaCy
