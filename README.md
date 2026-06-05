# SmartRecruit AI

**Intelligent Recruitment Platform for Morocco — Bachelor PFE 2026**

> An AI-powered platform that centralizes Moroccan job opportunities, extracts skills from CVs using NLP + LLM, and matches candidates with positions using a 3-component semantic scoring system.

---

## Key Features

| Feature | Tech |
|---------|------|
| **CV Skill Extraction** | PyMuPDF + Groq llama3-8b-8192 + regex taxonomy fallback |
| **3-Component Job Matching** | skill score (×0.60) + title fit (×0.25) + experience fit (×0.15) |
| **Two-Pass Semantic Matcher** | Exact keyword + all-MiniLM-L6-v2 cosine similarity (threshold 0.72) |
| **AI Cover Letter** | Groq LLM → personalised French letter + template fallback |
| **Career Roadmap** | Groq LLM → personalised advice with 24h cache |
| **Morocco-Only Jobs** | Rekrute.ma · Emploi.ma · Tanmia.ma · emploi-public.ma (scrapes every 6h) |
| **Public/Private Sector Filter** | Badge + filter pill on jobs page |
| **Deadline Notifications** | Daily 8am alerts for public-sector application deadlines |
| **Application Tracking** | Mark/unmark jobs as applied |
| **Saved Jobs** | Bookmark with one click, remove inline |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy 2, Pydantic v2, Alembic |
| **Database** | PostgreSQL 15 |
| **AI / NLP** | sentence-transformers (all-MiniLM-L6-v2), PyMuPDF, Groq (llama3-8b-8192) |
| **Scraping** | BeautifulSoup4, httpx, APScheduler (cron every 6h) |
| **Auth** | JWT (python-jose), bcrypt password hashing |
| **Testing** | pytest, httpx (44 tests) |

---

## Setup Guide

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |

### 1 — Clone

```bash
git clone https://github.com/chorokElmo/smartrecruitAi.git
cd smartrecruitAi
```

### 2 — PostgreSQL database

```sql
CREATE USER smartrecruit WITH PASSWORD 'smartrecruit_pass';
CREATE DATABASE smartrecruit_db OWNER smartrecruit;
GRANT ALL PRIVILEGES ON DATABASE smartrecruit_db TO smartrecruit;
```

### 3 — Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

copy .env.example .env          # Windows
# cp .env.example .env          # macOS/Linux
```

**Edit `.env`** — set your `DATABASE_URL` if different from default.  
**Optional but recommended:** add your free [Groq API key](https://console.groq.com/keys) to enable LLM features:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```
Without it the system falls back to regex + templates automatically.

```bash
alembic upgrade head            # create all tables
uvicorn app.main:app --port 8000 --reload
```

The server auto-seeds 12 demo Moroccan jobs and scrapes Rekrute on first start (if DB < 50 jobs).

### 4 — Frontend

```bash
cd frontend
npm install
npm run dev
```

App → **http://localhost:3000** | API docs → **http://localhost:8000/docs**

---

## How the AI Matching Works

```
Upload CV  →  extract text (PyMuPDF)
           →  LLM extraction (Groq) or regex fallback
           →  skills + diploma + domain + years_experience

For each job:
  skill_score      = two-pass matcher(user.skills, job.required_skills)
                     Pass 1: exact keyword   Pass 2: cosine sim ≥ 0.72
  title_score      = cosine_sim(user.domain, job.title)
  experience_score = min(1.0, user_years / required_years)  [0.5 if unknown]

  final = skill_score × 0.60
        + title_score × 0.25
        + experience_score × 0.15
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login → JWT |
| GET | `/api/v1/users/profile` | Get profile |
| PATCH | `/api/v1/users/profile` | Update profile + auto-recs |
| POST | `/api/v1/cv/upload` | Upload PDF → extract skills |
| GET | `/api/v1/jobs` | List jobs (search, location, contract, sector) |
| POST | `/api/v1/jobs/{id}/apply` | Mark as applied |
| POST | `/api/v1/jobs/{id}/cover-letter` | Generate AI cover letter |
| GET | `/api/v1/recommendations` | Stored AI matches |
| POST | `/api/v1/recommendations/generate` | Run full matching pipeline |
| GET | `/api/v1/recommendations/advice` | Career roadmap (24h cache) |
| GET | `/api/v1/notifications` | Deadline alerts |

---

## Project Structure

```
smartrecruit-ai/
├── backend/
│   ├── app/
│   │   ├── ai/            # cv_extractor, skill_extractor, cv_enricher,
│   │   │                  # semantic_matcher, embedder, llm_extractor
│   │   ├── models/        # User, Job, CV, Recommendation, Notification,
│   │   │                  # SavedJob, Roadmap, Application
│   │   ├── schemas/       # Pydantic DTOs
│   │   ├── repositories/  # DB access layer
│   │   ├── services/      # Business logic
│   │   └── routers/       # FastAPI endpoints
│   ├── scraper/           # RekruteScraper, EmploiScraper, TanmiaScraper,
│   │                      # EmploiPublicScraper, BaseScraper, scheduler
│   ├── tests/             # 44 pytest tests (auth, cv, recs, matcher)
│   ├── alembic/           # 8 DB migrations
│   └── seed_jobs.py       # 12 real Moroccan demo jobs
│
└── frontend/
    ├── app/
    │   ├── (auth)/        # Login, Register
    │   └── (dashboard)/   # Dashboard, Jobs, Profile, CV, Saved
    ├── components/
    │   ├── layout/        # Sidebar, TopBar, NotificationBell
    │   └── ui/            # Button, Input, ScoreRing, EmptyState…
    └── lib/
        ├── api/           # jobs, recommendations, cv, auth clients
        └── store/         # Zustand auth store
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| No jobs after install | App auto-seeds on startup; or run `python seed_jobs.py` |
| "relation does not exist" | Run `alembic upgrade head` |
| Cover letter / roadmap shows template | Add `GROQ_API_KEY` to `.env` |
| Cannot connect to DB | Check PostgreSQL is running + `.env` DATABASE_URL |
| Module not found | Activate venv: `.venv\Scripts\activate` |

---

## Author

**SmartRecruit AI** — PFE Bachelor, 2026  
Stack: FastAPI · Next.js 15 · PostgreSQL · sentence-transformers · Groq
