"""
Emploi.ma scraper — Morocco's second-largest job board.

SITE: https://www.emploi.ma
LANGUAGE: French / Arabic
TARGET: Listing pages (up to MAX_PAGES), extracting job cards.

HOW THE SITE IS STRUCTURED:
  Listing URL: https://www.emploi.ma/recherche-jobs-maroc?page={n}

  Each job card:
  <div class="card-job">
    <div class="card-job-detail">
      <h3 class="card-title">
        <a href="/offres-emploi/ingenieur-dev-12345">Ingénieur Développement</a>
      </h3>
      <div class="card-job-info">
        <span class="company-name">Société XYZ</span>
        <span class="location-name">Casablanca</span>
        <span class="contract-name">CDI</span>
      </div>
      <p class="card-text">Nous recherchons un ingénieur...</p>
      <span class="date-expiration">Expire le 30/06/2026</span>
    </div>
  </div>

NOTE FOR PFE:
  If selectors break, open emploi.ma in Chrome DevTools → Inspect a job card
  → right-click the element → Copy → Copy selector.
  Update _SEL_* constants below with the new selectors.
"""

import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.base_scraper import BaseScraper
from scraper.utils import safe_get, clean_html


class EmploiScraper(BaseScraper):
    """
    Scraper for emploi.ma — Morocco's #2 job platform.

    Strategy:
      1. Paginate listing pages (/recherche-jobs-maroc?page=N)
      2. Extract job cards from each page
      3. Parse title, company, location, contract type, description

    Typical yield: 50–200 jobs per run.
    """

    SOURCE_NAME   = "Emploi.ma"
    BASE_URL      = "https://www.emploi.ma"
    LISTING_URL   = "https://www.emploi.ma/recherche-jobs-maroc"
    REQUEST_DELAY = 2.0
    MAX_PAGES     = 8
    JOBS_PER_PAGE = 15

    # CSS selectors — update if site structure changes
    _SEL_JOB_CARD    = "div.card-job, article.job-item, div.offer-item"
    _SEL_TITLE       = "h3.card-title a, h2.job-title a, .title-offre a"
    _SEL_COMPANY     = ".company-name, .employer, .recruteur-name"
    _SEL_LOCATION    = ".location-name, .ville, .city"
    _SEL_CONTRACT    = ".contract-name, .type-contrat, .contrat"
    _SEL_DESCRIPTION = ".card-text, .description-offre, p.excerpt"
    _SEL_DEADLINE    = ".date-expiration, .expire, .deadline"
    _SEL_NO_RESULTS  = ".no-result, .aucune-offre, .empty-results"

    def fetch_jobs(self) -> list[dict]:
        """
        Paginate through emploi.ma listing pages.
        Stops when an empty page or error is encountered.
        """
        all_raw_jobs: list[dict] = []

        with self.get_http_client() as client:
            # Add Moroccan French language preference
            client.headers.update({
                "Accept-Language": "fr-MA,fr;q=0.9",
                "Referer": "https://www.emploi.ma/",
            })

            for page in range(1, self.MAX_PAGES + 1):
                url = f"{self.LISTING_URL}?page={page}"
                self.logger.debug(f"Fetching page {page}: {url}")

                resp = safe_get(url, client, self.logger, self.rate_limiter)
                if resp is None:
                    self.logger.warning(f"Page {page}: no response, stopping")
                    break

                # Check for "no results" page
                soup = BeautifulSoup(resp.text, "lxml")
                if soup.select_one(self._SEL_NO_RESULTS):
                    self.logger.info(f"Page {page}: no results — done")
                    break

                cards = self._extract_cards(soup)
                if not cards:
                    self.logger.info(f"Page {page}: 0 cards — reached end")
                    break

                all_raw_jobs.extend(cards)
                self.logger.info(f"Page {page}: {len(cards)} job cards")

                if len(cards) < self.JOBS_PER_PAGE:
                    break

        self.logger.info(f"Total raw jobs from Emploi.ma: {len(all_raw_jobs)}")
        return all_raw_jobs

    def _extract_cards(self, soup: BeautifulSoup) -> list[dict]:
        """Parse all job cards from a BeautifulSoup page object."""
        cards = soup.select(self._SEL_JOB_CARD)

        # Fallback: look for any div/article containing a job link
        if not cards:
            cards = [
                el for el in soup.find_all(["div", "article"])
                if el.find("a", href=re.compile(r"/(offres-emploi|job|offre)/"))
            ]

        return [r for card in cards if (r := self._parse_card(card, self.BASE_URL))]

    def _parse_card(self, card, base_url: str) -> Optional[dict]:
        """Extract fields from a single job card element."""

        # ── Title + URL ───────────────────────────────────────
        title_el = card.select_one(self._SEL_TITLE)
        if not title_el:
            title_el = card.find(
                "a", href=re.compile(r"/(offres-emploi|job|offre)/")
            )
        if not title_el:
            return None

        title      = title_el.get_text(strip=True)
        href       = title_el.get("href", "")
        source_url = urljoin(base_url, href) if href else None

        if not title:
            return None

        # ── Company ───────────────────────────────────────────
        company_el = card.select_one(self._SEL_COMPANY)
        company    = company_el.get_text(strip=True) if company_el else "Unknown"
        if not company:
            company = "Unknown"

        # ── Location ──────────────────────────────────────────
        location_el = card.select_one(self._SEL_LOCATION)
        location    = ""
        if location_el:
            for icon in location_el.find_all(["i", "svg"]):
                icon.decompose()
            location = location_el.get_text(strip=True)

        # ── Contract type ─────────────────────────────────────
        contract_el   = card.select_one(self._SEL_CONTRACT)
        contract_type = contract_el.get_text(strip=True) if contract_el else ""

        # ── Description ───────────────────────────────────────
        desc_el     = card.select_one(self._SEL_DESCRIPTION)
        description = clean_html(str(desc_el)) if desc_el else ""

        # ── Deadline / expiry ─────────────────────────────────
        deadline_el = card.select_one(self._SEL_DEADLINE)
        deadline    = self._parse_date(
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
        Validate parsed card data. BaseScraper.clean_data() handles normalisation.
        """
        if not raw.get("title"):
            return None
        # emploi.ma sometimes omits company — use placeholder so we don't lose the job
        if not raw.get("company"):
            raw["company"] = "Entreprise non précisée"
        return raw

    # ── Date parsing ──────────────────────────────────────────

    def _parse_date(self, text: str) -> Optional[str]:
        """
        Parse a date string like "30/06/2026" or "30 juin 2026"
        into an ISO 8601 string. Returns None if unparseable.
        """
        if not text:
            return None

        MONTHS_FR = {
            "janvier": 1, "février": 2, "fevrier": 2, "mars": 3,
            "avril": 4, "mai": 5, "juin": 6, "juillet": 7,
            "aout": 8, "août": 8, "septembre": 9, "octobre": 10,
            "novembre": 11, "décembre": 12, "decembre": 12,
        }

        # DD/MM/YYYY
        m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
        if m:
            try:
                d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                return datetime(y, mo, d, tzinfo=timezone.utc).isoformat()
            except ValueError:
                pass

        # DD Month YYYY (French)
        text_lower = text.lower()
        for name, num in MONTHS_FR.items():
            m2 = re.search(rf"(\d{{1,2}})\s+{name}\s+(\d{{4}})", text_lower)
            if m2:
                try:
                    d, y = int(m2.group(1)), int(m2.group(2))
                    return datetime(y, num, d, tzinfo=timezone.utc).isoformat()
                except ValueError:
                    pass

        return None
