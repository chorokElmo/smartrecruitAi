"""
Job deduplication via SHA-256 fingerprinting.

PROBLEM:
  The same job posting can appear multiple times:
    - Same scraper running twice (cron re-run)
    - Same job posted on Rekrute AND Indeed
    - Recruiter reposts an old listing

SOLUTION: Fingerprint
  For each job, compute a deterministic hash of:
      normalise(title) | normalise(company) | normalise(location)

  Before inserting, check if this hash is already in the DB.
  If yes → skip (duplicate). If no → insert and store hash.

WHY SHA-256?
  - Deterministic: same input → always same output
  - Collision-resistant: different jobs very rarely get same hash
  - Fast: microseconds per job
  - Already available in Python's stdlib (no extra packages)

NORMALISATION:
  "Développeur Python Senior" → "developpeur python senior"
  "ORH Assessment"           → "orh assessment"
  "Casablanca"               → "casablanca"
  Fingerprint = SHA256("developpeur python senior|orh assessment|casablanca")
"""

import hashlib
import re
import unicodedata

from sqlalchemy.orm import Session

from app.models.job import Job


# ─────────────────────────────────────────────────────────────
# Text normalisation
# ─────────────────────────────────────────────────────────────

def _normalise(text: str) -> str:
    """
    Convert text into a canonical form for fingerprinting.

    Steps:
      1. Lowercase
      2. Remove accents: é→e, ç→c, ü→u …  (NFD decomposition)
      3. Keep only letters, digits, spaces
      4. Collapse multiple spaces → single space
      5. Strip leading/trailing whitespace

    Examples:
      "Développeur Sénior" → "developpeur senior"
      "CDI – Casablanca!"  → "cdi  casablanca"  → "cdi casablanca"
    """
    text = text.lower().strip()
    # Decompose accented chars then drop the combining accent marks
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Keep only alphanumeric + spaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ─────────────────────────────────────────────────────────────
# Fingerprint generation
# ─────────────────────────────────────────────────────────────

def generate_fingerprint(title: str, company: str, location: str = "") -> str:
    """
    Generate a 64-character SHA-256 fingerprint for a job posting.

    The fingerprint is deterministic and portable:
      - Same inputs always produce the same hash
      - Works across different scraping runs and sources

    Args:
        title:    Job title, e.g. "Développeur Python Senior"
        company:  Company name, e.g. "ORH Assessment"
        location: City/region, e.g. "Casablanca" (optional)

    Returns:
        64-character lowercase hex string

    Example:
        >>> generate_fingerprint("Dev Python", "Tech Corp", "Rabat")
        'a3f8c291e4...'  (64 chars)
    """
    canonical = "|".join([
        _normalise(title   or ""),
        _normalise(company or ""),
        _normalise(location or ""),
    ])
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# Database duplicate check
# ─────────────────────────────────────────────────────────────

def is_duplicate(db: Session, fingerprint: str) -> bool:
    """
    Return True if a job with this fingerprint already exists in the DB.

    Uses a fast index lookup on Job.fingerprint (unique column).

    Args:
        db:          SQLAlchemy session
        fingerprint: SHA-256 hash string from generate_fingerprint()

    Returns:
        True  → this job is a duplicate, skip it
        False → this is a new job, insert it
    """
    return (
        db.query(Job.id)            # select only the PK (faster than full row)
          .filter(Job.fingerprint == fingerprint)
          .first()
    ) is not None


def filter_new_jobs(db: Session, jobs: list[dict]) -> tuple[list[dict], int]:
    """
    Filter a batch of job dicts, keeping only those not already in the DB.

    Assigns a fingerprint to each job dict in-place.

    Args:
        db:   SQLAlchemy session
        jobs: list of cleaned job dicts (must have title, company, location)

    Returns:
        (new_jobs, skipped_count)
          new_jobs      — jobs that are not in the DB yet (fingerprint added)
          skipped_count — how many were duplicates

    Usage:
        new_jobs, skipped = filter_new_jobs(db, cleaned_jobs)
        for job in new_jobs:
            repo.create(JobCreate(**job))
    """
    new_jobs: list[dict] = []
    skipped = 0

    for job in jobs:
        fp = generate_fingerprint(
            job.get("title", ""),
            job.get("company", ""),
            job.get("location", ""),
        )
        job["fingerprint"] = fp   # inject fingerprint in-place

        if is_duplicate(db, fp):
            skipped += 1
        else:
            new_jobs.append(job)

    return new_jobs, skipped
