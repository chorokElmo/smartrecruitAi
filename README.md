# SmartRecruit AI

**AI-Powered Recruitment Platform for Morocco — Bachelor PFE 2026**

> Centralises Moroccan job listings, extracts structured profiles from PDF CVs using a three-layer AI pipeline (PyMuPDF → spaCy/regex taxonomy → Groq LLM), and matches candidates with jobs through a weighted semantic scoring system.

---

## Features at a Glance

| Feature | Details |
|---------|---------|
| **CV Parsing** | PyMuPDF text extraction → Groq `llama3-8b-8192` structured extraction → regex/spaCy fallback |
| **Skill Matching** | Two-pass: exact keyword first, then cosine similarity via `all-MiniLM-L6-v2` (threshold 0.72) |
| **Weighted Score** | `skill × 0.60 + title × 0.25 + experience × 0.15` |
| **Live Match** | On-demand Groq re-scoring for any single job without regenerating all recommendations |
| **AI Cover Letter** | Groq LLM → personalised French letter, template fallback if no API key |
| **Career Roadmap** | Groq LLM → personalised advice cached 24 h per user |
| **Job Scrapers** | Rekrute · Emploi.ma · Tanmia · EmploiPublic · Indeed · RemoteOK — deduplicated, every 6 h |
| **Sector Filter** | Public / private badge + filter pill on jobs page |
| **Deadline Alerts** | Daily 8 am notifications for public-sector application deadlines |
| **Application Tracking** | Mark / unmark applied, full applied-jobs list |
| **Saved Jobs** | Bookmark with one click, remove inline |
| **CV Builder** | In-app CV generator with live preview |
| **Onboarding** | First-login wizard to collect skills and experience |
| **Score History** | Per-user match score timeline stored across sessions |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy 2, Pydantic v2, Alembic |
| **Database** | PostgreSQL 16 |
| **AI / NLP** | `sentence-transformers` (`all-MiniLM-L6-v2`), PyMuPDF, Groq (`llama3-8b-8192`), spaCy |
| **Scraping** | BeautifulSoup4, httpx, APScheduler (cron every 6 h) |
| **Auth** | JWT (`python-jose`), bcrypt, token fingerprinting, role support |
| **Infrastructure** | Docker Compose (3 services), Render.com + Neon DB deployment config |
| **Testing** | pytest + httpx — 44 tests across 4 suites |

---

## AI Architecture

### Three-Layer CV Pipeline

```
PDF upload
  │
  ▼
Layer 1 — Text Extraction
  PyMuPDF → raw text from every page

  │
  ▼
Layer 2 — Skill Extraction
  regex taxonomy (251 skills in skills_taxonomy.json)
  + spaCy NLP (en_core_web_sm) for entity context

  │
  ▼
Layer 3 — Structured Parsing (optional, requires GROQ_API_KEY)
  Groq llama3-8b-8192 → { skills, diploma, domain, years_experience }
  Falls back to regex/taxonomy output if Groq is unavailable
```

### Two-Pass Semantic Matcher

```
user.skills  ×  job.required_skills
     │
     ├─ Pass 1 — Exact keyword match
     │     Fast O(n) scan; matches "Python" → "Python"
     │
     └─ Pass 2 — Embedding similarity
           all-MiniLM-L6-v2 cosine similarity
           Accept if score ≥ 0.72
           Catches "Machine Learning" ↔ "ML", "JS" ↔ "JavaScript"
```

### Weighted Scoring Formula

```
skill_score      = two_pass_match(user.skills, job.required_skills)   [0 – 1]
title_score      = cosine_sim(user.domain_embedding, job.title)        [0 – 1]
experience_score = min(1.0, user.years / job.required_years)           [0.5 if unknown]

final_score = skill_score      × 0.60
            + title_score      × 0.25
            + experience_score × 0.15
```

Results are stored per-user in the `recommendations` table and can be regenerated on demand or triggered live via Groq for a single job.

---

## Project Structure

```
smartrecruitAi/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── cv_extractor.py        # PyMuPDF text extraction
│   │   │   ├── skill_extractor.py     # regex + spaCy taxonomy scan
│   │   │   ├── llm_extractor.py       # Groq structured extraction
│   │   │   ├── cv_enricher.py         # merges LLM + regex outputs
│   │   │   ├── embedder.py            # all-MiniLM-L6-v2 singleton
│   │   │   ├── semantic_matcher.py    # two-pass matcher + scoring
│   │   │   └── matcher.py             # recommendation orchestration
│   │   ├── models/                    # User, Job, CV, Recommendation,
│   │   │                              # Notification, SavedJob, Application,
│   │   │                              # Roadmap, ScoreHistory
│   │   ├── schemas/                   # Pydantic v2 DTOs
│   │   ├── repositories/              # SQLAlchemy data-access layer
│   │   ├── services/                  # Business logic
│   │   └── routers/                   # FastAPI route handlers
│   ├── scraper/
│   │   ├── rekrute_scraper.py
│   │   ├── emploi_scraper.py
│   │   ├── tanmia_scraper.py
│   │   ├── emploi_public_scraper.py
│   │   ├── indeed_scraper.py
│   │   ├── remoteok_scraper.py
│   │   ├── base_scraper.py            # dedup + fingerprint logic
│   │   ├── deduplication.py
│   │   └── scheduler.py               # APScheduler — scrape every 6 h
│   ├── alembic/versions/              # 14 migrations
│   ├── tests/
│   │   ├── test_auth.py               # 10 tests
│   │   ├── test_cv.py                 # 8 tests
│   │   ├── test_recommendations.py    # 7 tests
│   │   └── test_semantic_matcher.py   # 19 tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed_jobs.py
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/                    # Login, Register
│   │   └── (dashboard)/
│   │       ├── dashboard/             # AI matches overview
│   │       ├── jobs/                  # Job list + detail ([id])
│   │       ├── cv/                    # Upload + CV builder
│   │       ├── profile/               # Skills, experience, settings
│   │       └── applications/          # Applied jobs tracker
│   ├── components/
│   │   ├── layout/                    # Sidebar, TopBar, NotificationBell
│   │   └── ui/                        # ScoreRing, EmptyState, Skeleton…
│   └── lib/
│       ├── api/                       # Typed API clients (axios)
│       └── store/                     # Zustand auth store
│
├── docker-compose.yml
└── render.yaml
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Login → JWT |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/users/profile` | Fetch current user profile |
| `PATCH` | `/api/v1/users/profile` | Update profile (triggers recs refresh) |

### CV

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/cv/upload` | Upload PDF → full AI extraction |
| `GET` | `/api/v1/cv/latest` | Fetch latest parsed CV |
| `POST` | `/api/v1/cv/generate` | Generate CV from profile data |
| `POST` | `/api/v1/cv/debug` | Debug extraction output |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/jobs` | List jobs (search, location, contract, sector) |
| `GET` | `/api/v1/jobs/{id}` | Job detail |
| `GET` | `/api/v1/jobs/filters` | Available filter options |
| `GET` | `/api/v1/jobs/count` | Total active job count |
| `POST` | `/api/v1/jobs/{id}/save` | Bookmark a job |
| `DELETE` | `/api/v1/jobs/{id}/save` | Remove bookmark |
| `GET` | `/api/v1/jobs/saved` | List saved jobs |
| `POST` | `/api/v1/jobs/{id}/apply` | Mark as applied |
| `DELETE` | `/api/v1/jobs/{id}/apply` | Unmark applied |
| `GET` | `/api/v1/jobs/applied` | Applied job IDs |
| `GET` | `/api/v1/jobs/applied/full` | Full applied-jobs list |
| `POST` | `/api/v1/jobs/{id}/cover-letter` | Generate AI cover letter |

### Recommendations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/recommendations` | Stored AI matches |
| `POST` | `/api/v1/recommendations/generate` | Run full matching pipeline |
| `POST` | `/api/v1/recommendations/live-match` | On-demand Groq match for one job |
| `GET` | `/api/v1/recommendations/history` | Score history over time |
| `GET` | `/api/v1/recommendations/advice` | Career roadmap (24 h cache) |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/notifications` | Deadline alerts for public-sector jobs |

---

## Setup

### Option A — Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/chorokElmo/smartrecruitAi.git
cd smartrecruitAi

# Optional — set a secure secret key and Groq API key
cp backend/.env backend/.env.local
# edit .env.local → SECRET_KEY=<random>, GROQ_API_KEY=<your key>

docker compose up --build
```

- First run downloads the `all-MiniLM-L6-v2` model (~80 MB) into a named volume.  
- Migrations run automatically via `preDeployCommand`.  
- Frontend → **http://localhost:3000** | API → **http://localhost:8000** | Docs → **http://localhost:8000/docs**

```bash
docker compose down        # stop
docker compose down -v     # stop + wipe database
```

---

### Option B — Manual (local dev)

#### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 15+ |

#### 1 — Clone

```bash
git clone https://github.com/chorokElmo/smartrecruitAi.git
cd smartrecruitAi
```

#### 2 — Database

```sql
CREATE USER smartrecruit WITH PASSWORD 'smartrecruit_pass';
CREATE DATABASE smartrecruit_db OWNER smartrecruit;
GRANT ALL PRIVILEGES ON DATABASE smartrecruit_db TO smartrecruit;
```

#### 3 — Backend

```bash
cd backend

python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

cp .env.example .env            # copy environment template
```

Edit `.env`:

```env
DATABASE_URL=postgresql://smartrecruit:smartrecruit_pass@localhost:5432/smartrecruit_db
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
GROQ_API_KEY=gsk_xxxx   # optional — get a free key at console.groq.com
```

> Without `GROQ_API_KEY` the system falls back to regex + template output automatically. All core features still work.

```bash
alembic upgrade head                          # apply all 14 migrations
uvicorn app.main:app --port 8000 --reload     # start API server
```

On first start the server auto-populates the database if fewer than 50 jobs are present.

#### 4 — Frontend

```bash
cd frontend
npm install
npm run dev
```

App → **http://localhost:3000** | API docs → **http://localhost:8000/docs**

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

44 tests across four suites: `test_auth`, `test_cv`, `test_recommendations`, `test_semantic_matcher`.

---

## Deployment

The repository includes production-ready config for **Render.com** (backend) + **Neon** (managed PostgreSQL) + **Vercel** (frontend).

**Backend on Render:**
1. Create a new Web Service, connect the GitHub repo, set root to `backend/`.
2. Render picks up `render.yaml` automatically (build + migrate + start commands).
3. Add env vars in the Render dashboard: `DATABASE_URL` (from Neon), `SECRET_KEY`, `GROQ_API_KEY`, `ALLOWED_ORIGINS`.

**Frontend on Vercel:**
1. Import the repo, set root to `frontend/`.
2. Add env var: `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com/api/v1`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No jobs after install | Startup auto-populates; or run `python seed_jobs.py` |
| `relation does not exist` | Run `alembic upgrade head` |
| Cover letter / roadmap shows template | Add `GROQ_API_KEY` to `.env` |
| Cannot connect to DB | Check PostgreSQL is running and `DATABASE_URL` is correct |
| `ModuleNotFoundError` | Activate venv: `.venv\Scripts\activate` (Windows) |
| bcrypt version error | Run `pip install "bcrypt==4.0.1"` |

---

## Roadmap

| Status | Item |
|--------|------|
| Done | CV upload + AI extraction (PyMuPDF + Groq + regex) |
| Done | Two-pass semantic matcher + weighted scoring |
| Done | 6 Moroccan job scrapers + APScheduler deduplication |
| Done | AI cover letter + career roadmap generation |
| Done | Application tracking + saved jobs |
| Done | Public-sector filter + deadline notifications |
| Done | CV builder + onboarding wizard |
| Done | Docker Compose + Render/Neon/Vercel deployment config |
| Done | Test suite (44 tests) |
| Planned | Email notifications |
| Planned | Multi-language support (AR / FR / EN) |
| Planned | Employer-side job posting portal |

---

## Author

**SmartRecruit AI** — PFE Bachelor, 2026  
Stack: FastAPI · Next.js 15 · PostgreSQL 16 · sentence-transformers · Groq · Docker
