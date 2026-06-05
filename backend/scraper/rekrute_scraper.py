"""
Rekrute scraper — Morocco's largest job board (rekrute.com).

SITE: https://www.rekrute.com
LANGUAGE: French / Arabic
TARGET: Listing pages only (no detail-page fetching to keep HTTP requests low)

HOW THE SITE IS STRUCTURED (updated June 2026 after HTML change):
  Listing URL: https://www.rekrute.com/offres.html?s=1&p={page}&o=1

  Each job card:
  <li class="post-id" id="{job_id}">
    <div>
      <div class="col-sm-2">
        <a href="/recruteur-{company_slug}.html">
          <img alt="Company Name" .../>
        </a>
      </div>
      <div class="col-sm-10">
        <div class="section1">
          <h2 class="titreJob">
            <a class="titreJob" href="/offre-emploi-{slug}.html">Job Title | City (Maroc)</a>
          </h2>
          <!-- A second link may appear with ?#matching4K suffix — ignore it -->
          <ul class="info-post">
            <li><span>Company Name</span></li>
            <li><i class="fa-map-marker"></i> Casablanca</li>
            <li>CDI</li>
          </ul>
          <p class="description">Short job description...</p>
        </div>
      </div>
    </div>
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
    MAX_PAGES      = 15      # scrape up to 15 pages
    JOBS_PER_PAGE  = 10      # rekrute.com returns ~10 cards per page

    # ── CSS selectors (updated June 2026) ─────────────────────
    # Primary card: <li class="post-id" id="{id}">
    _SEL_JOB_CARD    = "li.post-id"

    # Title link: <a class="titreJob" href="/offre-emploi-...">
    # One card may have two links: the real one + one with ?#matching4K → ignore the latter
    _SEL_TITLE       = "a.titreJob"

    # Company: try several possible containers
    _SEL_COMPANY     = (
        ".info-post li:first-child span, "
        ".info-post .company, "
        ".entreprise, "
        ".info-company, "
        ".recruteur"
    )

    # Company from logo img alt text (fallback)
    _SEL_COMPANY_IMG = "img[alt]"   # in col-sm-2

    # Location: icon + text inside info-post
    _SEL_LOCATION    = ".info-post .location, .ville, .adresse"

    # Contract type
    _SEL_CONTRACT    = ".info-post .type-contract, .contrat, .type-poste"

    # Description excerpt
    _SEL_DESCRIPTION = ".description, .texte-offre, p.info"

    # Deadline
    _SEL_DEADLINE    = ".date-limite, .deadline, .date-expiration"

    def fetch_jobs(self) -> list[dict]:
        """
        Paginate through rekrute.com listing pages (all sectors, no filter).
        Returns a list of raw dicts, one per job card found.
        """
        all_raw_jobs: list[dict] = []

        with self.get_http_client() as client:
            for page in range(1, self.MAX_PAGES + 1):
                # No &s= filter → returns all sectors
                url = f"{self.LISTING_URL}?p={page}&o=1"
                self.logger.debug(f"Fetching page {page}: {url}")

                resp = safe_get(url, client, self.logger, self.rate_limiter)
                if resp is None:
                    self.logger.warning(f"No response for page {page}, stopping")
                    break

                cards = self._extract_cards_from_page(resp.text, base_url=self.BASE_URL)

                if not cards:
                    self.logger.info(f"No cards on page {page} — reached end of results")
                    break

                all_raw_jobs.extend(cards)
                self.logger.info(f"Page {page}: found {len(cards)} job cards")

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

        # Primary selector (updated June 2026)
        cards = soup.select(self._SEL_JOB_CARD)

        if not cards:
            # Fallback: any <li> that contains a job link
            cards = [
                li for li in soup.find_all("li")
                if li.find("a", href=re.compile(r"/offre-emploi-"))
            ]
            if cards:
                self.logger.debug(
                    f"Primary selector '{self._SEL_JOB_CARD}' found nothing — "
                    f"fallback found {len(cards)} cards"
                )

        raw_jobs = []
        for card in cards:
            try:
                raw = self._card_to_dict(card, base_url)
                if raw:
                    raw_jobs.append(raw)
            except Exception as e:
                self.logger.warning(f"Card parse error: {e}")

        return raw_jobs

    def _card_to_dict(self, card, base_url: str) -> Optional[dict]:
        """Extract fields from a single job card element."""

        # ── Title + URL ───────────────────────────────────────
        # Find all links that look like job URLs but exclude ?#matching4K variants
        job_links = [
            a for a in card.find_all("a", href=re.compile(r"/offre-emploi-"))
            if "#matching4K" not in a.get("href", "")
        ]

        # Prefer <a class="titreJob"> first, then any clean job link
        title_el = None
        for a in job_links:
            if "titreJob" in (a.get("class") or []):
                title_el = a
                break
        if title_el is None and job_links:
            title_el = job_links[0]

        # Last resort: the CSS selector
        if title_el is None:
            title_el = card.select_one(self._SEL_TITLE)

        if title_el is None:
            self.logger.debug("Card skipped — no title link found")
            return None

        raw_title = title_el.get_text(strip=True)
        href      = title_el.get("href", "")
        source_url = urljoin(base_url, href) if href else None

        if not raw_title:
            return None

        # ── Parse "Job Title | City (Maroc)" format ───────────
        # rekrute.com encodes title as "Poste | Ville (Maroc)"
        title, location_from_title = self._split_title_location(raw_title)

        # ── Company ───────────────────────────────────────────
        company = ""

        # Attempt 1: structured selectors
        company_el = card.select_one(self._SEL_COMPANY)
        if company_el:
            company = company_el.get_text(strip=True)

        # Attempt 2: company logo alt text in col-sm-2
        if not company:
            col2 = card.select_one(".col-sm-2, .logo, .company-logo")
            if col2:
                img = col2.find("img", alt=True)
                if img:
                    company = img["alt"].strip()

        # Attempt 3: any <a> linking to a recruiter/company profile
        if not company:
            recruiter_link = card.find(
                "a", href=re.compile(r"/(recruteur|entreprise|company)-")
            )
            if recruiter_link:
                company = recruiter_link.get_text(strip=True)

        # Fallback: label so we don't lose the job posting
        if not company:
            company = "Rekrute"

        # ── Location ──────────────────────────────────────────
        location = ""

        # Try CSS selector first
        location_el = card.select_one(self._SEL_LOCATION)
        if location_el:
            for icon in location_el.find_all("i"):
                icon.decompose()
            location = location_el.get_text(strip=True)

        # Fall back to what was embedded in the title text
        if not location and location_from_title:
            location = location_from_title

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
        if not raw.get("title"):
            return None
        # Company is required by BaseScraper but we always set a fallback,
        # so this should never be empty here.
        return raw   # clean_data() in BaseScraper handles the rest

    # ── Helpers ───────────────────────────────────────────────

    def _split_title_location(self, text: str) -> tuple[str, str]:
        """
        Rekrute job titles often have the format:
            "Développeur Full Stack | Casablanca (Maroc)"
            "Stage Data Science | Rabat (Maroc)"

        This method splits them and cleans up the location suffix.

        Returns:
            (title, location) — both are stripped strings.
            If no " | " is present, returns (text, "").
        """
        if " | " in text:
            parts = text.split(" | ", 1)
            job_title  = parts[0].strip()
            # Remove "(Maroc)" suffix from city name
            location   = re.sub(r"\s*\(Maroc\)\s*$", "", parts[1], flags=re.IGNORECASE).strip()
            return job_title, location
        return text.strip(), ""

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
