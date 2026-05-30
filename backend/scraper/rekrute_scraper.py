"""
Rekrute scraper — Morocco's largest job board (rekrute.com).

SITE: https://www.rekrute.com
LANGUAGE: French / Arabic
TARGET: Listing pages only (no detail-page fetching to keep HTTP requests low)

HOW THE SITE IS STRUCTURED:
  Listing URL: https://www.rekrute.com/offres.html?s=1&p={page}&o=1

  Each job card:
  <li class="li-offre-container">
    <div class="holder">
      <h2 class="title">
        <a href="/offre-emploi-{slug}.html">Job Title</a>
      </h2>
      <span class="company">Company Name</span>
      <span class="location"><i class="fa fa-map-marker"></i> Casablanca</span>
      <span class="type-contract">CDI</span>
      <p class="description">Short job description...</p>
    </div>
    <div class="deadline">Expire le: 15/07/2026</div>
  </li>

  Pagination: ?p=1, ?p=2, ... until we see an empty page or "No results"

NOTE FOR PFE:
  Web scraping is fragile — rekrute.com may change their HTML at any time.
  If this scraper stops working, open DevTools on the site and inspect
  the actual class names, then update the CSS selectors below.

  The architecture (BaseScraper pattern) remains valid regardless of
  which CSS selectors you use.
"""

import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from scraper.base_scraper import BaseScraper
from scraper.utils import safe_get, clean_html


class RekruteScraper(BaseScraper):
    """
    Scraper for rekrute.com — Morocco's #1 job board.

    Strategy:
      1. Paginate through listing pages (up to MAX_PAGES)
      2. Extract all job cards from each page
      3. Parse each card into our standard dict (no detail-page fetch)

    Typical yield: 100–500 jobs per run.
    """

    SOURCE_NAME    = "Rekrute"
    BASE_URL       = "https://www.rekrute.com"
    LISTING_URL    = "https://www.rekrute.com/offres.html"
    REQUEST_DELAY  = 2.0     # polite delay between requests
    MAX_PAGES      = 10      # scrape up to 10 pages (~200 jobs)
    JOBS_PER_PAGE  = 20

    # CSS selectors — update these if the site changes structure
    _SEL_JOB_CARD    = "li.li-offre-container"
    _SEL_TITLE       = "h2.title a, h3.title a, .post-title a"
    _SEL_COMPANY     = ".company, .info-company, .recruteur"
    _SEL_LOCATION    = ".location, .ville, .adresse"
    _SEL_CONTRACT    = ".type-contract, .contrat, .type-poste"
    _SEL_DESCRIPTION = ".description, .texte-offre, p.info"
    _SEL_DEADLINE    = ".date-limite, .deadline, .date-expiration"

    def fetch_jobs(self) -> list[dict]:
        """
        Paginate through rekrute.com listing pages.
        Returns a list of raw dicts, one per job card found.
        """
        all_raw_jobs: list[dict] = []

        with self.get_http_client() as client:
            for page in range(1, self.MAX_PAGES + 1):
                url = f"{self.LISTING_URL}?s=1&p={page}&o=1"
                self.logger.debug(f"Fetching page {page}: {url}")

                resp = safe_get(url, client, self.logger, self.rate_limiter)
                if resp is None:
                    self.logger.warning(f"No response for page {page}, stopping pagination")
                    break

                cards = self._extract_cards_from_page(resp.text, base_url=self.BASE_URL)

                if not cards:
                    self.logger.info(f"No cards on page {page} — reached end of results")
                    break

                all_raw_jobs.extend(cards)
                self.logger.info(f"Page {page}: found {len(cards)} job cards")

                # If we got fewer cards than expected, this was the last page
                if len(cards) < self.JOBS_PER_PAGE:
                    break

        self.logger.info(f"Total raw jobs from Rekrute: {len(all_raw_jobs)}")
        return all_raw_jobs

    def _extract_cards_from_page(self, html: str, base_url: str) -> list[dict]:
        """
        Parse one listing HTML page and extract all job cards.

        Returns a list of dicts, each containing raw card data.
        The dicts are source-specific (not yet in standard format).
        """
        soup = BeautifulSoup(html, "lxml")

        # Try primary selector, then fall back to simpler ones
        cards = soup.select(self._SEL_JOB_CARD)

        if not cards:
            # Fallback: any <li> that contains a job link
            cards = [
                li for li in soup.find_all("li")
                if li.find("a", href=re.compile(r"/offre-emploi-"))
            ]

        raw_jobs = []
        for card in cards:
            raw = self._card_to_dict(card, base_url)
            if raw:
                raw_jobs.append(raw)
        return raw_jobs

    def _card_to_dict(self, card, base_url: str) -> Optional[dict]:
        """Extract fields from a single job card element."""

        # ── Title + URL ───────────────────────────────────────
        title_el = card.select_one(self._SEL_TITLE)
        if title_el is None:
            # Try any link that looks like a job URL
            title_el = card.find("a", href=re.compile(r"/offre-emploi-"))
        if title_el is None:
            return None

        title      = title_el.get_text(strip=True)
        href       = title_el.get("href", "")
        source_url = urljoin(base_url, href) if href else None

        if not title:
            return None

        # ── Company ───────────────────────────────────────────
        company_el = card.select_one(self._SEL_COMPANY)
        company    = company_el.get_text(strip=True) if company_el else ""

        # ── Location ──────────────────────────────────────────
        location_el = card.select_one(self._SEL_LOCATION)
        location    = ""
        if location_el:
            # Strip icon text (e.g. Font Awesome glyphs)
            for icon in location_el.find_all("i"):
                icon.decompose()
            location = location_el.get_text(strip=True)

        # ── Contract type ─────────────────────────────────────
        contract_el   = card.select_one(self._SEL_CONTRACT)
        contract_type = contract_el.get_text(strip=True) if contract_el else ""

        # ── Description (short excerpt) ───────────────────────
        desc_el     = card.select_one(self._SEL_DESCRIPTION)
        description = clean_html(str(desc_el)) if desc_el else ""

        # ── Deadline ──────────────────────────────────────────
        deadline_el = card.select_one(self._SEL_DEADLINE)
        deadline    = self._parse_french_date(
            deadline_el.get_text(strip=True) if deadline_el else ""
        )
        expires_at  = deadline or (
            datetime.now(timezone.utc) + timedelta(days=30)
        ).isoformat()

        return {
            "title":         title,
            "company":       company,
            "location":      location,
            "description":   description,
            "contract_type": contract_type,
            "source_url":    source_url,
            "deadline":      deadline,
            "expires_at":    expires_at,
        }

    def parse_job(self, raw: dict) -> Optional[dict]:
        """
        The raw dict from _card_to_dict() is already mostly clean.
        This method validates required fields and passes it through.
        """
        if not raw.get("title") or not raw.get("company"):
            return None
        return raw   # clean_data() in BaseScraper handles the rest

    # ── Helpers ───────────────────────────────────────────────

    def _parse_french_date(self, text: str) -> Optional[str]:
        """
        Try to parse a French-format date string like "15/07/2026"
        or "Expire le 15 Juillet 2026" into an ISO format string.

        Returns ISO string "YYYY-MM-DDT00:00:00+00:00" or None.
        """
        if not text:
            return None

        MONTHS_FR = {
            "janvier": 1, "février": 2, "mars": 3, "avril": 4,
            "mai": 5, "juin": 6, "juillet": 7, "août": 8,
            "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12,
        }

        # Pattern: DD/MM/YYYY
        m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
        if m:
            try:
                d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                return datetime(y, mo, d, tzinfo=timezone.utc).isoformat()
            except ValueError:
                pass

        # Pattern: "15 Juillet 2026"
        text_lower = text.lower()
        for month_name, month_num in MONTHS_FR.items():
            m2 = re.search(rf"(\d{{1,2}})\s+{month_name}\s+(\d{{4}})", text_lower)
            if m2:
                try:
                    d, y = int(m2.group(1)), int(m2.group(2))
                    return datetime(y, month_num, d, tzinfo=timezone.utc).isoformat()
                except ValueError:
                    pass

        return None
