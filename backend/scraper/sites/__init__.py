import time
import logging
import httpx

logger = logging.getLogger("scraper.sites")

HEADERS = {"User-Agent": "Mozilla/5.0", "Accept-Language": "fr-MA,fr"}


def fetch(url: str, retries: int = 3, delay: int = 5):
    """GET with retry. Returns httpx.Response or None."""
    for attempt in range(1, retries + 1):
        try:
            r = httpx.get(url, headers=HEADERS, timeout=20, follow_redirects=True)
            if r.status_code == 200:
                return r
            logger.warning("[%s] status %s (attempt %d)", url, r.status_code, attempt)
        except Exception as e:
            logger.warning("[%s] error %s (attempt %d)", url, e, attempt)
        if attempt < retries:
            time.sleep(delay)
    logger.error("[%s] failed after %d retries", url, retries)
    return None


def empty_job(source: str) -> dict:
    return {
        "title": "", "company": "", "location": "", "description": "",
        "contract_type": None, "source": source, "apply_url": "",
        "deadline": None, "required_skills": [],
    }
