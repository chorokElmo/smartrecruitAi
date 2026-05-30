"""
SmartRecruit AI — Scraper Package (Phase 2)

Available scrapers:
  RemoteOkScraper  — remoteok.com   (JSON API, most reliable)
  RekruteScraper   — rekrute.com    (Morocco's #1 job board)
  EmploiScraper    — emploi.ma      (Morocco's #2 job board)
  IndeedScraper    — indeed.com/ma  (best-effort, bot-detection present)

All scrapers inherit from BaseScraper and follow the Template Method pattern:
  run() → fetch_jobs() → parse_job() → clean_data() → save_jobs()

Usage (one-off manual run):
  from app.database import SessionLocal
  from scraper.remoteok_scraper import RemoteOkScraper

  db = SessionLocal()
  result = RemoteOkScraper(db).run()
  print(result.to_dict())
  db.close()

Scheduled runs (every 6 hours):
  Managed by scraper.scheduler — started/stopped via FastAPI lifespan events.
"""

from scraper.remoteok_scraper import RemoteOkScraper
from scraper.rekrute_scraper  import RekruteScraper
from scraper.emploi_scraper   import EmploiScraper
from scraper.indeed_scraper   import IndeedScraper

__all__ = [
    "RemoteOkScraper",
    "RekruteScraper",
    "EmploiScraper",
    "IndeedScraper",
]
