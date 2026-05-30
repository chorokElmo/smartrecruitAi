"""
RemoteOK scraper — uses the official JSON API.

RemoteOK provides a public JSON API at https://remoteok.com/api
No HTML parsing needed — most reliable of all scrapers.

API response format:
  [
    {"legal": "..."},               ← first element is metadata, skip it
    {
      "id":          "12345",
      "epoch":       1716000000,
      "position":    "Senior Python Developer",
      "company":     "Acme Corp",
      "location":    "Worldwide",
      "description": "<p>We need...</p>",
      "tags":        ["python", "django", "remote"],
      "url":         "https://remoteok.com/remote-jobs/12345",
      ...
    },
    ...
  ]

Rate limits: Be polite, 2s+ delay. They require a Referer header.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from scraper.base_scraper import BaseScraper
from scraper.utils import safe_get, clean_html


class RemoteOkScraper(BaseScraper):
    """
    Scraper for remoteok.com — remote tech jobs worldwide.

    Uses the public JSON API: no HTML parsing, no pagination complexity.
    Jobs are tagged with technologies (python, react, etc.) which map
    directly to required_skills.

    Typical yield: 50–150 jobs per run.
    """

    SOURCE_NAME   = "RemoteOK"
    BASE_URL      = "https://remoteok.com/api"
    REQUEST_DELAY = 2.5   # RemoteOK is generous but respect their server

    # Tags in these categories map to contract types
    _FREELANCE_TAGS = {"contract", "freelance", "contractor"}
    _INTERN_TAGS    = {"intern", "internship", "junior"}

    def fetch_jobs(self) -> list[dict]:
        """
        GET https://remoteok.com/api
        Returns the JSON array, stripping the first metadata element.
        """
        with self.get_http_client() as client:
            # RemoteOK returns 403 without a Referer header.
            # Accept-Encoding: identity → request plain JSON, not gzip bytes.
            client.headers.update({
                "Referer":          "https://remoteok.com/",
                "Accept":           "application/json",
                "Accept-Encoding":  "identity",
                "X-Requested-With": "XMLHttpRequest",
            })
            resp = safe_get(self.BASE_URL, client, self.logger, self.rate_limiter)

        if resp is None:
            self.logger.error("RemoteOK API returned no response")
            return []

        try:
            # Try standard JSON parse first; fall back to manual gzip decode
            try:
                data = resp.json()
            except Exception:
                import gzip, json as _json
                data = _json.loads(gzip.decompress(resp.content))
        except Exception as e:
            self.logger.error(f"Failed to parse RemoteOK JSON: {e}")
            return []

        # First element is a legal notice dict without "position" key — skip it
        jobs = [item for item in data if isinstance(item, dict) and "position" in item]
        self.logger.info(f"RemoteOK API returned {len(jobs)} job records")
        return jobs

    def parse_job(self, raw: dict) -> Optional[dict]:
        """
        Map a RemoteOK API job object to our standard job dict.

        Handles:
          - HTML description → plain text via clean_html()
          - Tags → required_skills list
          - Contract type inference from tags
          - expires_at set to 30 days from now (API has no deadline field)
        """
        title   = (raw.get("position") or "").strip()
        company = (raw.get("company")  or "").strip()

        # title and company are required
        if not title or not company:
            return None

        # ── Skills from tags ──────────────────────────────────
        tags   = raw.get("tags") or []
        skills = [t.strip().lower() for t in tags if isinstance(t, str) and t.strip()]

        # ── Contract type from tags ───────────────────────────
        tag_set       = set(skills)
        contract_type = None
        if tag_set & self._FREELANCE_TAGS:
            contract_type = "Freelance"
        elif tag_set & self._INTERN_TAGS:
            contract_type = "Stage"
        else:
            contract_type = "CDI"   # most RemoteOK listings are full-time

        # ── Description: clean HTML ───────────────────────────
        description = clean_html(raw.get("description") or "")

        # ── Location ──────────────────────────────────────────
        location = (raw.get("location") or "Remote").strip() or "Remote"

        # ── Expiry: 30 days from today ────────────────────────
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        # ── Source URL ────────────────────────────────────────
        source_url = raw.get("url") or self.BASE_URL

        return {
            "title":           title,
            "company":         company,
            "location":        location,
            "description":     description,
            "required_skills": skills,
            "contract_type":   contract_type,
            "source_url":      source_url,
            "expires_at":      expires_at,
            "deadline":        None,
        }
