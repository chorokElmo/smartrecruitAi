"""
Indeed Morocco scraper — indeed.com for the Moroccan market.

SITE: https://ma.indeed.com
LANGUAGE: French / Arabic
TARGET: Job listings for Morocco

⚠  IMPORTANT NOTE FOR PFE:
  Indeed is the hardest site to scrape reliably:
    - Uses bot-detection (Cloudflare, JavaScript challenges)
    - HTML structure changes frequently
    - May return CAPTCHA instead of job listings
    - Recent versions rely heavily on JavaScript rendering

  This scraper implements a BEST-EFFORT approach:
    - Uses polite delays and browser-like headers
    - Falls back gracefully if blocked (returns 0 jobs, logs a warning)
    - Does NOT use a headless browser (out of scope for PFE)

  If you want reliable Indeed data for your PFE demo:
    Option A: Use their official "Publisher API" (requires application)
    Option B: Focus on RemoteOK + Rekrute + Emploi.ma (sufficient for PFE)
    Option C: Mock data — add a "demo" mode that returns fixture jobs

  The scraper is INCLUDED so the architecture is complete.
  Whether it successfully fetches live data depends on Indeed's current
  anti-bot posture, which changes regularly.

HOW THE SITE IS STRUCTURED (when accessible):
  URL: https://ma.indeed.com/jobs?q={query}&l=Maroc&start={offset}

  <div class="job_seen_beacon">
    <h2 class="jobTitle"><a class="jcs-JobTitle">Développeur Python</a></h2>
    <span class="companyName">Tech Company</span>
    <div class="companyLocation">Casablanca, Maroc</div>
    <div class="job-snippet"><ul>...</ul></div>
  </div>
"""

import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urljoin, urlencode

from bs4 import BeautifulSoup

from scraper.base_scraper import BaseScraper
from scraper.utils import safe_get, clean_html


class IndeedScraper(BaseScraper):
    """
    Best-effort scraper for Indeed Morocco (ma.indeed.com).

    Searches for Moroccan tech jobs. Gracefully returns empty list
    if blocked — does not raise exceptions to avoid crashing the scheduler.

    Typical yield: 0–50 jobs (highly variable due to bot detection).
    """

    SOURCE_NAME   = "Indeed"
    BASE_URL      = "https://ma.indeed.com"
    REQUEST_DELAY = 3.0    # Longer delay — Indeed is sensitive to rapid requests
    MAX_PAGES     = 5
    RESULTS_PER_PAGE = 15  # Indeed shows 15 results per page

    # Search queries to rotate across runs (covers more job types)
    _SEARCH_QUERIES = [
        "développeur",
        "informatique",
        "ingénieur logiciel",
        "data analyst",
        "marketing digital",
    ]

    # CSS selectors (Indeed changes these periodically)
    _SEL_JOB_CARD = [
        "div.job_seen_beacon",
        "div[data-testid='slider_item']",
        "li.css-5lfssm",         # alternate structure
        "div.jobsearch-SerpJobCard",
    ]
    _SEL_TITLE    = ["h2.jobTitle a", ".jcs-JobTitle", "h2 a.jobtitle"]
    _SEL_COMPANY  = ["span.companyName", ".companyName", "span[data-testid='company-name']"]
    _SEL_LOCATION = ["div.companyLocation", ".companyLocation", "div[data-testid='job-location']"]
    _SEL_SNIPPET  = ["div.job-snippet", ".summary", "div[data-testid='job-snippet']"]

    def fetch_jobs(self) -> list[dict]:
        """
        Search Indeed Morocco with multiple queries.
        Returns raw job card dicts from all successful pages.
        """
        all_raw: list[dict] = []

        with self.get_http_client() as client:
            client.headers.update({
                "Referer":    "https://ma.indeed.com/",
                "Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "fr-MA,fr;q=0.9",
            })

            for query in self._SEARCH_QUERIES:
                query_jobs = self._search_query(client, query)
                all_raw.extend(query_jobs)
                if len(all_raw) >= 100:  # cap total to avoid abuse
                    break

        self.logger.info(f"Total raw jobs from Indeed: {len(all_raw)}")
        return all_raw

    def _search_query(self, client, query: str) -> list[dict]:
        """Fetch jobs for one search query, paginating up to MAX_PAGES."""
        results = []
        self.logger.info(f"Indeed: searching '{query}'")

        for page in range(self.MAX_PAGES):
            offset = page * self.RESULTS_PER_PAGE
            params = urlencode({"q": query, "l": "Maroc", "start": offset})
            url = f"{self.BASE_URL}/jobs?{params}"

            resp = safe_get(url, client, self.logger, self.rate_limiter)
            if resp is None:
                self.logger.warning(f"Indeed: no response for query='{query}' page={page+1}")
                break

            # Detect CAPTCHA / block page
            if self._is_blocked(resp.text):
                self.logger.warning(
                    f"Indeed: bot-detection triggered for query='{query}'. "
                    f"Stopping this query. This is normal behaviour for Indeed."
                )
                break

            cards = self._extract_cards(resp.text)
            if not cards:
                self.logger.info(f"Indeed: no cards on page {page+1} for '{query}'")
                break

            results.extend(cards)
            self.logger.debug(f"Indeed: page {page+1} → {len(cards)} cards for '{query}'")

            if len(cards) < self.RESULTS_PER_PAGE:
                break

        return results

    def _is_blocked(self, html: str) -> bool:
        """Return True if Indeed's bot-detection page was returned instead of jobs."""
        block_signals = [
            "captcha",
            "unusual traffic",
            "trafic inhabituel",
            "verify you are human",
            "please verify",
            "cf-browser-verification",
            "blocked",
        ]
        html_lower = html.lower()
        return any(sig in html_lower for sig in block_signals)

    def _extract_cards(self, html: str) -> list[dict]:
        """Parse job cards from an Indeed results page."""
        soup = BeautifulSoup(html, "lxml")
        cards = []

        # Try each known card selector until we find one that works
        for selector in self._SEL_JOB_CARD:
            found = soup.select(selector)
            if found:
                cards = found
                break

        return [r for card in cards if (r := self._parse_card(card))]

    def _parse_card(self, card) -> Optional[dict]:
        """Extract fields from a single job card."""

        # ── Title + URL ───────────────────────────────────────
        title_el = None
        for sel in self._SEL_TITLE:
            title_el = card.select_one(sel)
            if title_el:
                break
        if not title_el:
            return None

        title = title_el.get_text(strip=True)
        href  = title_el.get("href", "")
        if not href:
            # Try parent link
            parent_a = title_el.find_parent("a")
            href = parent_a.get("href", "") if parent_a else ""

        source_url = urljoin(self.BASE_URL, href) if href else self.BASE_URL

        # ── Company ───────────────────────────────────────────
        company = ""
        for sel in self._SEL_COMPANY:
            el = card.select_one(sel)
            if el:
                company = el.get_text(strip=True)
                break

        # ── Location ──────────────────────────────────────────
        location = "Maroc"
        for sel in self._SEL_LOCATION:
            el = card.select_one(sel)
            if el:
                location = el.get_text(strip=True)
                break

        # ── Snippet / description ─────────────────────────────
        description = ""
        for sel in self._SEL_SNIPPET:
            el = card.select_one(sel)
            if el:
                description = clean_html(str(el))
                break

        # ── Expiry: 30 days ───────────────────────────────────
        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        if not title:
            return None

        return {
            "title":         title,
            "company":       company or "Unknown",
            "location":      location,
            "description":   description,
            "contract_type": "",      # Indeed rarely shows contract type in snippets
            "source_url":    source_url,
            "deadline":      None,
            "expires_at":    expires_at,
        }

    def parse_job(self, raw: dict) -> Optional[dict]:
        """Validate and return — clean_data() in BaseScraper does normalisation."""
        if not raw.get("title"):
            return None
        return raw
