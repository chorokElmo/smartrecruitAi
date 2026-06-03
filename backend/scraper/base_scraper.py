"""
BaseScraper — abstract base class for all job scrapers.

DESIGN PATTERN: Template Method
  run() defines the fixed algorithm skeleton:
      fetch → parse → clean → deduplicate → save

  Subclasses customize only the source-specific steps:
      fetch_jobs()   ← how to GET the website
      parse_job()    ← how to extract fields from raw HTML/JSON

  Everything else (cleaning, dedup, saving, error handling)
  is inherited for free.

HOW TO CREATE A NEW SCRAPER:
  1. Create backend/scraper/mysite_scraper.py
  2. class MySiteScraper(BaseScraper):
         SOURCE_NAME = "MySite"
         BASE_URL    = "https://mysite.com/jobs"
         def fetch_jobs(self): ...
         def parse_job(self, raw): ...
  3. Register it in scheduler.py (Phase 3)

WHAT EACH SCRAPER RETURNS (standard job dict):
  {
    "title":          str   — required
    "company":        str   — required
    "location":       str   — optional
    "description":    str   — optional
    "required_skills": list  — optional, filled by AI later
    "contract_type":  str   — CDI | CDD | Stage | Freelance | None
    "source_url":     str   — link back to original posting
    "deadline":       str   — ISO date "YYYY-MM-DD" or None
    "expires_at":     str   — ISO date, when to auto-deactivate
  }
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional
import logging

import httpx
from sqlalchemy.orm import Session

from scraper.deduplication import generate_fingerprint, is_duplicate
from scraper.utils import get_http_client, RateLimiter
from app.repositories.job_repository import JobRepository
from app.schemas.job import JobCreate


# ─────────────────────────────────────────────────────────────
# Scraper result object
# ─────────────────────────────────────────────────────────────

class ScraperResult:
    """
    Holds statistics and status for a single scraping run.
    Returned by BaseScraper.run() and stored by the scheduler.

    Attributes:
        source      : name of the website scraped (e.g. "Rekrute")
        jobs_found  : total raw jobs retrieved before dedup
        jobs_added  : new jobs actually inserted into the DB
        jobs_skipped: duplicates that were ignored
        errors      : list of error messages (non-fatal)
    """

    def __init__(self, source: str):
        self.source = source
        self.started_at: datetime = datetime.now(timezone.utc)
        self.finished_at: Optional[datetime] = None
        self.jobs_found: int = 0
        self.jobs_added: int = 0
        self.jobs_skipped: int = 0
        self.errors: list[str] = []

    def finish(self):
        """Mark the run as complete (called at end of run())."""
        self.finished_at = datetime.now(timezone.utc)

    @property
    def duration_seconds(self) -> float:
        if self.finished_at:
            return (self.finished_at - self.started_at).total_seconds()
        return 0.0

    @property
    def success(self) -> bool:
        """True if no errors occurred during the run."""
        return len(self.errors) == 0

    def to_dict(self) -> dict:
        """Serialise to dict for API responses and log storage."""
        return {
            "source": self.source,
            "started_at": self.started_at.isoformat(),
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": round(self.duration_seconds, 2),
            "jobs_found": self.jobs_found,
            "jobs_added": self.jobs_added,
            "jobs_skipped": self.jobs_skipped,
            "errors": self.errors,
            "success": self.success,
        }


# ─────────────────────────────────────────────────────────────
# Abstract base scraper
# ─────────────────────────────────────────────────────────────

class BaseScraper(ABC):
    """
    Abstract base class that every website scraper must inherit from.

    Class attributes to set in each subclass:
        SOURCE_NAME     : human-readable source name stored in DB
        BASE_URL        : entry URL for the job listing page
        REQUEST_DELAY   : seconds to wait between HTTP requests
    """

    # ── Subclasses MUST override these ────────────────────────
    SOURCE_NAME: str = ""
    BASE_URL: str = ""
    REQUEST_DELAY: float = 1.5   # polite default: 1.5 seconds between requests

    def __init__(self, db: Session):
        if not self.SOURCE_NAME:
            raise ValueError(
                f"{self.__class__.__name__} must define SOURCE_NAME as a class attribute."
            )
        self.db = db
        self.job_repo = JobRepository(db)
        self.rate_limiter = RateLimiter(delay=self.REQUEST_DELAY, jitter=0.5)
        self.logger = logging.getLogger(f"scraper.{self.SOURCE_NAME}")
        self.result = ScraperResult(self.SOURCE_NAME)

    # ── Abstract methods — MUST be implemented by subclasses ──

    @abstractmethod
    def fetch_jobs(self) -> list[dict]:
        """
        Retrieve raw job data from the website.

        Implementors should:
          - Paginate through multiple pages if needed
          - Use self.rate_limiter.wait() between requests
          - Use self.get_http_client() for HTTP calls
          - Return a list of raw dicts (website-specific format)

        Example return:
          [{"href": "/job/123", "title_text": "Dev Python", ...}, ...]
        """
        ...

    @abstractmethod
    def parse_job(self, raw_job: dict) -> Optional[dict]:
        """
        Transform one raw item into our standard job dict.

        Args:
            raw_job: one element from the list returned by fetch_jobs()

        Returns:
            Standard job dict (see module docstring), or None to skip.

        Return None when:
          - The job is clearly a duplicate from earlier in the same run
          - Required fields (title, company) are missing/empty
          - The posting is for a location we don't serve
        """
        ...

    # ── Concrete methods — shared logic, all scrapers inherit ─

    def clean_data(self, job: dict) -> dict:
        """
        Normalise and sanitise a parsed job dict.

        What this does:
          - Strips leading/trailing whitespace from all string fields
          - Caps field lengths to match DB column sizes
          - Normalises contract_type to our standard vocabulary
          - Injects SOURCE_NAME and scraped_at timestamp

        Subclasses can override this for source-specific cleanup
        (e.g. if a site uses "Full-Time" instead of "CDI").
        """
        # Map raw contract type strings → our standard vocabulary
        CONTRACT_MAP = {
            "cdi": "CDI",
            "contrat à durée indéterminée": "CDI",
            "permanent": "CDI",
            "full-time": "CDI",
            "cdd": "CDD",
            "contrat à durée déterminée": "CDD",
            "temporary": "CDD",
            "stage": "Stage",
            "internship": "Stage",
            "stagiaire": "Stage",
            "freelance": "Freelance",
            "indépendant": "Freelance",
            "contract": "Freelance",
        }

        cleaned = {
            "title":          (job.get("title") or "").strip()[:255],
            "company":        (job.get("company") or "").strip()[:255],
            "location":       (job.get("location") or "").strip()[:255],
            "description":    (job.get("description") or "").strip()[:10_000],
            "required_skills": job.get("required_skills") or [],
            "contract_type":  None,
            "source_name":    self.SOURCE_NAME,
            "source_url":     job.get("source_url"),
            "deadline":       job.get("deadline"),
            "expires_at":     job.get("expires_at"),
            "scraped_at":     datetime.now(timezone.utc).isoformat(),
        }

        # Normalise contract type (case-insensitive lookup)
        raw_ct = (job.get("contract_type") or "").lower().strip()
        cleaned["contract_type"] = CONTRACT_MAP.get(raw_ct)

        return cleaned

    def save_jobs(self, jobs: list[dict]) -> None:
        """
        Insert jobs into the database, skipping duplicates.

        Deduplication is fingerprint-based: each job gets a SHA-256
        hash of (title + company + location). If that hash already
        exists in the DB, the job is counted as skipped.
        """
        for job_data in jobs:
            try:
                fp = generate_fingerprint(
                    job_data["title"],
                    job_data["company"],
                    job_data.get("location", ""),
                )

                if is_duplicate(self.db, fp):
                    self.result.jobs_skipped += 1
                    self.logger.debug(
                        f"[SKIP] duplicate: {job_data['title']!r} @ {job_data['company']!r}"
                    )
                    continue

                job_data["fingerprint"] = fp
                self.job_repo.create(JobCreate(**job_data))
                self.result.jobs_added += 1
                self.logger.debug(
                    f"[NEW]  saved: {job_data['title']!r} @ {job_data['company']!r}"
                )

            except Exception as e:
                msg = f"Save failed for '{job_data.get('title', '?')}': {e}"
                self.logger.error(msg)
                self.result.errors.append(msg)
                # IMPORTANT: after any DB error the session enters a "needs
                # rollback" state.  If we don't rollback here, the failed Job
                # object stays pending and every subsequent db.commit() tries to
                # re-INSERT it → cascading UniqueViolation errors for all the
                # remaining cards.  Rolling back resets the session cleanly so
                # the next card starts with a fresh transaction.
                try:
                    self.db.rollback()
                except Exception:
                    pass

    def run(self) -> ScraperResult:
        """
        Execute the full scraping pipeline for this source.

        Pipeline:
          1. fetch_jobs()  — get raw data from website
          2. parse_job()   — convert each raw item to standard dict
          3. clean_data()  — normalise fields
          4. save_jobs()   — insert new jobs, skip duplicates

        Any exception in fetch_jobs() aborts the run entirely.
        Exceptions in parse_job() / clean_data() skip that single job.
        Exceptions in save_jobs() are logged but don't stop the batch.

        Returns:
            ScraperResult with stats (jobs_found, jobs_added, errors…)
        """
        self.logger.info(f"[{self.SOURCE_NAME}] ── Starting scrape run ──")

        try:
            # Step 1: Fetch
            raw_jobs = self.fetch_jobs()
            self.result.jobs_found = len(raw_jobs)
            self.logger.info(f"[{self.SOURCE_NAME}] Fetched {len(raw_jobs)} raw jobs")

            # Step 2 + 3: Parse and clean
            cleaned_jobs: list[dict] = []
            for raw in raw_jobs:
                try:
                    parsed = self.parse_job(raw)
                    if not parsed:
                        continue
                    # Require at minimum a title and company
                    if not parsed.get("title") or not parsed.get("company"):
                        continue
                    cleaned_jobs.append(self.clean_data(parsed))
                except Exception as e:
                    msg = f"Parse/clean error: {e}"
                    self.logger.warning(msg)
                    self.result.errors.append(msg)

            self.logger.info(
                f"[{self.SOURCE_NAME}] Parsed {len(cleaned_jobs)} valid jobs"
            )

            # Step 4: Save
            self.save_jobs(cleaned_jobs)

        except Exception as e:
            # Fatal error — the whole run failed
            msg = f"Fatal scraper error: {e}"
            self.logger.error(msg, exc_info=True)
            self.result.errors.append(msg)

        finally:
            self.result.finish()
            self.logger.info(
                f"[{self.SOURCE_NAME}] ── Run complete ── "
                f"found={self.result.jobs_found} | "
                f"added={self.result.jobs_added} | "
                f"skipped={self.result.jobs_skipped} | "
                f"errors={len(self.result.errors)} | "
                f"duration={self.result.duration_seconds:.1f}s"
            )

        return self.result

    # ── Helper exposed to subclasses ──────────────────────────

    def get_http_client(self) -> httpx.Client:
        """Return a pre-configured httpx client (browser headers, timeouts)."""
        return get_http_client(self.SOURCE_NAME)
