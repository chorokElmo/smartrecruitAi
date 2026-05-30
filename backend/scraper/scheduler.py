"""
APScheduler-based background job scheduler for SmartRecruit AI.

WHAT IT DOES:
  1. Runs all scrapers every 6 hours automatically
  2. Deactivates expired job listings every hour
  3. Stores the last N scraper run results in memory + a JSON log file
  4. Provides get_recent_logs() for the admin API

DESIGN DECISIONS FOR PFE:
  - Uses BackgroundScheduler (threads) not AsyncIOScheduler (async)
    → Simpler to reason about, works fine with FastAPI's sync endpoints
  - Log persistence is a JSON file (not a DB table)
    → Avoids adding a migration just for scheduler logs
    → Log file survives server restarts
  - Each scraper gets its own try/except so one failure doesn't kill others

USAGE:
  # In main.py — attach to FastAPI lifecycle:
  from scraper.scheduler import start_scheduler, stop_scheduler

  @app.on_event("startup")
  def on_startup():
      start_scheduler()

  @app.on_event("shutdown")
  def on_shutdown():
      stop_scheduler()
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.database import SessionLocal

logger = logging.getLogger("scraper.scheduler")

# ─────────────────────────────────────────────────────────────
# Log file configuration
# ─────────────────────────────────────────────────────────────

_LOG_DIR  = Path(__file__).parent.parent / "logs"
_LOG_FILE = _LOG_DIR / "scraper_runs.json"
_MAX_LOGS = 100   # keep last 100 runs in memory + file

# In-memory buffer for fast reads by the API
_recent_logs: list[dict] = []

# ─────────────────────────────────────────────────────────────
# Scheduler instance
# ─────────────────────────────────────────────────────────────

_scheduler: Optional[BackgroundScheduler] = None


def _load_logs_from_file() -> None:
    """Load previously saved logs from JSON file into memory buffer."""
    global _recent_logs
    if _LOG_FILE.exists():
        try:
            with open(_LOG_FILE, "r", encoding="utf-8") as f:
                _recent_logs = json.load(f)
            logger.info(f"Loaded {len(_recent_logs)} historical scraper logs")
        except Exception as e:
            logger.warning(f"Could not load scraper logs: {e}")
            _recent_logs = []


def _append_log(result_dict: dict) -> None:
    """
    Append a scraper run result to the in-memory buffer and persist to disk.

    Maintains a rolling window of MAX_LOGS entries.
    """
    global _recent_logs
    _recent_logs.append(result_dict)

    # Keep only the latest _MAX_LOGS entries
    if len(_recent_logs) > _MAX_LOGS:
        _recent_logs = _recent_logs[-_MAX_LOGS:]

    # Persist to file
    try:
        _LOG_DIR.mkdir(parents=True, exist_ok=True)
        with open(_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(_recent_logs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Could not persist scraper log: {e}")


def get_recent_logs(limit: int = 20) -> list[dict]:
    """
    Return the most recent scraper run logs (newest first).

    Called by GET /api/v1/scrapers/logs.

    Args:
        limit: Maximum number of log entries to return.

    Returns:
        List of scraper run dicts, newest first.
    """
    return list(reversed(_recent_logs[-limit:]))


# ─────────────────────────────────────────────────────────────
# Scraper job function
# ─────────────────────────────────────────────────────────────

def _run_scraper(scraper_class) -> dict:
    """
    Instantiate and run one scraper with a fresh DB session.

    Catches all exceptions so a failing scraper doesn't crash the scheduler.

    Returns:
        ScraperResult.to_dict() with stats and error info.
    """
    db = SessionLocal()
    try:
        scraper   = scraper_class(db)
        result    = scraper.run()
        result_d  = result.to_dict()
        _append_log(result_d)
        logger.info(
            f"[{result.source}] added={result.jobs_added} "
            f"skipped={result.jobs_skipped} errors={len(result.errors)}"
        )
        return result_d
    except Exception as e:
        # Even if the scraper itself crashes, we log it and move on
        error_entry = {
            "source":           scraper_class.SOURCE_NAME,
            "started_at":       datetime.now(timezone.utc).isoformat(),
            "finished_at":      datetime.now(timezone.utc).isoformat(),
            "duration_seconds": 0,
            "jobs_found":       0,
            "jobs_added":       0,
            "jobs_skipped":     0,
            "errors":           [str(e)],
            "success":          False,
        }
        _append_log(error_entry)
        logger.error(f"[{scraper_class.SOURCE_NAME}] Unhandled error: {e}", exc_info=True)
        return error_entry
    finally:
        db.close()


def run_scraper_by_name(name: str) -> Optional[dict]:
    """
    Run a single scraper identified by SOURCE_NAME string.
    Used by the admin API endpoint POST /scrapers/run/{name}.

    Args:
        name: SOURCE_NAME value, e.g. "Rekrute", "RemoteOK"

    Returns:
        ScraperResult dict, or None if the name is not recognised.
    """
    # Import here to avoid circular imports at module load time
    from scraper.remoteok_scraper import RemoteOkScraper
    from scraper.rekrute_scraper   import RekruteScraper
    from scraper.emploi_scraper    import EmploiScraper
    from scraper.indeed_scraper    import IndeedScraper

    REGISTRY = {
        "remoteok": RemoteOkScraper,
        "rekrute":  RekruteScraper,
        "emploi.ma": EmploiScraper,
        "indeed":   IndeedScraper,
    }

    scraper_cls = REGISTRY.get(name.lower())
    if scraper_cls is None:
        return None

    return _run_scraper(scraper_cls)


def run_all_scrapers() -> list[dict]:
    """
    Run ALL registered scrapers in sequence.

    Called by the cron job every 6 hours.
    Also callable manually from the admin API (POST /scrapers/run/all).

    Returns:
        List of ScraperResult dicts (one per scraper).
    """
    from scraper.remoteok_scraper import RemoteOkScraper
    from scraper.rekrute_scraper   import RekruteScraper
    from scraper.emploi_scraper    import EmploiScraper
    from scraper.indeed_scraper    import IndeedScraper

    SCRAPERS = [RemoteOkScraper, RekruteScraper, EmploiScraper, IndeedScraper]

    logger.info("═══ Starting scheduled scrape run — all sources ═══")
    results = [_run_scraper(cls) for cls in SCRAPERS]

    total_added = sum(r.get("jobs_added", 0) for r in results)
    total_errors = sum(len(r.get("errors", [])) for r in results)
    logger.info(
        f"═══ Scrape run complete — "
        f"total_added={total_added} total_errors={total_errors} ═══"
    )
    return results


def _deactivate_expired_jobs() -> None:
    """
    Hourly job: mark expired job listings as inactive.

    Uses JobRepository.deactivate_expired() which does a bulk UPDATE
    WHERE expires_at < NOW() AND is_active = TRUE.
    """
    db = SessionLocal()
    try:
        from app.repositories.job_repository import JobRepository
        repo    = JobRepository(db)
        count   = repo.deactivate_expired()
        if count:
            logger.info(f"Deactivated {count} expired job listings")
    except Exception as e:
        logger.error(f"Error deactivating expired jobs: {e}", exc_info=True)
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Scheduler lifecycle
# ─────────────────────────────────────────────────────────────

def start_scheduler() -> None:
    """
    Start the APScheduler background scheduler.

    Jobs scheduled:
      - run_all_scrapers()       : every 6 hours (at :00 of hours 0,6,12,18)
      - _deactivate_expired_jobs(): every hour

    Call this from FastAPI's startup event.
    """
    global _scheduler

    if _scheduler and _scheduler.running:
        logger.warning("Scheduler already running — skipping start")
        return

    # Load historical logs before starting
    _load_logs_from_file()

    _scheduler = BackgroundScheduler(
        job_defaults={
            "coalesce":        True,   # if a job missed its slot, run once only
            "max_instances":   1,      # never run two instances of the same job
            "misfire_grace_time": 300, # 5-minute grace period for late execution
        }
    )

    # Scraping job — every 6 hours
    _scheduler.add_job(
        run_all_scrapers,
        trigger=CronTrigger(hour="0,6,12,18", minute=0),
        id="scrape_all",
        name="Scrape all job sources",
        replace_existing=True,
    )

    # Freshness job — every hour
    _scheduler.add_job(
        _deactivate_expired_jobs,
        trigger=IntervalTrigger(hours=1),
        id="deactivate_expired",
        name="Deactivate expired job listings",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("Scheduler started — scraping every 6 hours, freshness check every hour")


def stop_scheduler() -> None:
    """
    Gracefully stop the scheduler.
    Call this from FastAPI's shutdown event.
    """
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
