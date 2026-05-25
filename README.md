# SmartRecruit AI

**Intelligent Recruitment Monitoring and Recommendation Platform**

> Bachelor Final Year Project (PFE) — AI-powered platform that centralizes Moroccan job opportunities, extracts skills from CVs, and matches candidates with positions using NLP.

---

## Overview

SmartRecruit AI solves a real problem: Moroccan students waste hours searching fragmented portals (ANAPEC, company sites, university boards) for internships and jobs. This platform centralizes opportunities and uses AI to match candidates based on their actual skills.

### Key Features

- **CV Skill Extraction** — Upload a PDF CV; regex + taxonomy matching extract your skills automatically
- **Compatibility Scoring** — Each job shows a percentage match based on your skill profile
- **Missing Skills Analysis** — See exactly which skills you need to improve your score
- **Smart Recommendations** — AI-ranked job feed personalized to your profile
- **Job Aggregation** — Real listings scraped from Rekrute.com + sample data

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, SQLAlchemy, Pydantic v2 |
| Database | PostgreSQL 15 |
| AI / NLP | PyMuPDF (PDF extraction), Regex skill taxonomy |
| Scraping | requests, BeautifulSoup4, lxml |

---

## Full Setup Guide (New Machine)

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.11+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://postgresql.org |

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/chorokElmo/smartrecruitAi.git
cd smartrecruitAi
```

---

### Step 2 — Create the PostgreSQL database

Open **psql** or **pgAdmin** and run:

```sql
CREATE USER smartrecruit WITH PASSWORD 'smartrecruit_pass';
CREATE DATABASE smartrecruit_db OWNER smartrecruit;
GRANT ALL PRIVILEGES ON DATABASE smartrecruit_db TO smartrecruit;
```

---

### Step 3 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.dev.txt
pip install requests beautifulsoup4 lxml    # for the scraper
```

**Create the `.env` file:**

```bash
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

The default values match the database from Step 2. Edit `.env` if you used different credentials.

**Run database migrations** (creates all tables):

```bash
alembic upgrade head
```

**Populate job data** — pick one:

```bash
# Option A — Quick sample data (12 jobs, offline, instant) ✅ Recommended for first setup
python seed_jobs.py

# Option B — Real jobs from Rekrute.com (~5 min, requires internet)
python scraper.py --pages 3
```

> ⚠️ **This step is required.** Without it, uploading a CV will show 0 job recommendations because the database is empty.

**Start the backend server:**

```bash
# Windows
.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000

# macOS / Linux
uvicorn app.main:app --reload --port 8000
```

API → http://localhost:8000  
Swagger docs → http://localhost:8000/docs

---

### Step 4 — Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
copy .env.local.example .env.local      # Windows
# cp .env.local.example .env.local      # macOS / Linux

# Start dev server
npm run dev
```

App → http://localhost:3000

---

## Running the Project (Daily Use)

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open http://localhost:3000

---

## Scraping More Real Jobs

```bash
cd backend
python scraper.py --pages 5      # ~100 real Moroccan IT jobs
python scraper.py --dry-run      # preview without inserting to DB
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login, returns JWT |
| GET | `/api/v1/jobs` | List jobs with filters |
| POST | `/api/v1/cv/upload` | Upload PDF CV + extract skills |
| GET | `/api/v1/recommendations` | AI-ranked job matches |
| GET | `/api/v1/jobs/{id}/match` | Compatibility score for one job |

---

## How the AI Matching Works

1. **CV Upload** → PyMuPDF extracts all text from the PDF
2. **Skill Extraction** → regex matches 150+ skills from a taxonomy (Python, React, Docker, SQL, etc.)
3. **Scoring** → for each job: `score = matched_skills / required_skills`
4. **Ranking** → jobs sorted by score descending

Example: CV has `[Python, FastAPI, Docker]`, job requires `[Python, FastAPI, PostgreSQL, Docker]`
→ 3 out of 4 matched = **75% compatibility**

---

## Project Structure

```
smartrecruit-ai/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── repositories/  # Database access layer
│   │   ├── services/      # Business logic layer
│   │   ├── routers/       # FastAPI HTTP endpoints
│   │   └── ai/            # CV parsing + skill extraction + job matching
│   ├── alembic/           # Database migrations
│   ├── scraper.py         # Rekrute.com job scraper
│   ├── seed_jobs.py       # Sample data seeder
│   ├── .env.example       # Environment variables template
│   ├── requirements.txt       # Full dependencies (with ML)
│   └── requirements.dev.txt   # Lightweight (recommended)
│
└── frontend/
    ├── app/
    │   ├── (auth)/        # Login & Register pages
    │   └── (dashboard)/   # Dashboard, Jobs, Profile, CV, Saved
    ├── components/        # Shared UI components
    ├── store/             # Zustand state management
    └── .env.local.example # Frontend environment template
```

---

## Common Problems & Fixes

### No jobs appear after uploading CV
The database is empty. Run the seeder:
```bash
cd backend
python seed_jobs.py
```

### Cannot connect to database
- Make sure PostgreSQL is running
- Check `.env` has the correct `DATABASE_URL`
- Verify the user and database exist (Step 2)

### "relation does not exist" error
Run migrations first:
```bash
alembic upgrade head
```

### "Module not found" Python errors
Activate the virtual environment:
```bash
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # macOS / Linux
```

### CSS/styles broken on frontend
Clear Next.js cache and restart:
```bash
cd frontend
# Windows PowerShell:
Remove-Item -Recurse -Force .next
# macOS / Linux:
rm -rf .next
npm run dev
```

---

## Development Roadmap

- [x] Phase 1 — Architecture & Design
- [x] Phase 2 — Backend API (auth, users, jobs, CV, recommendations)
- [x] Phase 3 — AI Engine (CV parsing, skill extraction, matching)
- [x] Phase 4 — Frontend (all pages, dashboard, profile, saved jobs)
- [x] Phase 5 — Real data scraping (Rekrute.com)
- [ ] Phase 6 — Testing & Deployment

---

## Author

**SmartRecruit AI** — PFE Bachelor Project  
Built with FastAPI + Next.js + PostgreSQL
