"""
EmploiPublic scraper — Morocco's public-sector job board (emploi-public.ma).

SITE: https://www.emploi-public.ma
LANGUAGE: French / Arabic
TARGET: Listing pages — concours, postes budgétaires, recrutements publics

HOW THE SITE IS STRUCTURED:
  Listing URL: https://www.emploi-public.ma/fr/offresEmploi.aspx

  Each job card:
  <div class="offre-item">
    <h3 class="title"><a href="/fr/offre-detail.aspx?id=NNN">Job Title</a></h3>
    <span class="organisation">Ministère de ...</span>
    <span class="lieu">Casablanca</span>
    <span class="date-limite">31/12/2026</span>
  </div>

  Alternative structure (the site has been redesigned a few times):
  <tr class="ligne-offre">
    <td class="poste"><a>Title</a></td>
    <td class="organisme">Organisation</td>
    <td class="ville">Ville</td>
    <td class="date">31/12/2026</td>
  </tr>

NOTE FOR PFE:
  emploi-public.ma is an official Moroccan government portal.
  If the scraper returns 0 jobs, inspect the live page in DevTools
  and update the CSS selectors below.  The architecture is valid
  regardless of which selectors are used.
"""

import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from scraper.base_scraper import BaseScraper
from scraper.utils import safe_get, clean_html


class EmploiPublicScraper(BaseScraper):
    """
    Scraper for emploi-public.ma — Morocco's public-sector recruitment portal.

    All jobs from this source are tagged sector="public".
    """

    SOURCE_NAME   = "emploi-public.ma"
    BASE_URL      = "https://www.emploi-public.ma"
    LISTING_URL   = "https://www.emploi-public.ma/fr/offresEmploi.aspx"
    REQUEST_DELAY = 2.0
    MAX_PAGES     = 5
    JOBS_PER_PAGE = 20

    # CSS selectors — update if site structure changes
    # Primary: card-style layout
    _SEL_CARD         = ".offre-item, .offre-emploi, .job-item, .concours-item"
    _SEL_CARD_TITLE   = "h3 a, h2 a, .title a, .poste a"
    _SEL_CARD_ORG     = ".organisation, .organisme, .ministere, .recruteur"
    _SEL_CARD_LOC     = ".lieu, .ville, .location, .localisation"
    _SEL_CARD_DATE    = ".date-limite, .date, .echeance, .cloture"

    # Fallback: table-row layout
    _SEL_ROW         = "tr.ligne-offre, tr.offre-row, tbody tr"
    _SEL_ROW_TITLE   = "td.poste a, td.titre a, td:first-child a"
    _SEL_ROW_ORG     = "td.organisme, td.organisation, td:nth-child(2)"
    _SEL_ROW_LOC     = "td.ville, td.lieu, td:nth-child(3)"
    _SEL_ROW_DATE    = "td.date, td.echeance, td:last-child"

    def fetch_jobs(self) -> list[dict]:
        """Paginate through the listing pages and collect all raw job dicts."""
        all_jobs: list[dict] = []

        with self.get_http_client() as client:
            for page in range(1, self.MAX_PAGES + 1):
                # The site may use ?page=N or ?p=N or POST pagination
                if page == 1:
                    url = self.LISTING_URL
                else:
                    url = f"{self.LISTING_URL}?page={page}"

                self.logger.debug(f"Fetching page {page}: {url}")
                resp = safe_get(url, client, self.logger, self.rate_limiter)
                if resp is None:
                    self.logger.warning(f"No response for page {page}, stopping")
                    break

                cards = self._extract_from_page(resp.text, self.BASE_URL)
                if not cards:
                    self.logger.info(f"No cards on page {page} — end of results")
                    break

                all_jobs.extend(cards)
                self.logger.info(f"Page {page}: found {len(cards)} job cards")

                if len(cards) < self.JOBS_PER_PAGE:
                    break   # last page

        self.logger.info(f"Total raw jobs from {self.SOURCE_NAME}: {len(all_jobs)}")
        return all_jobs

    def _extract_from_page(self, html: str, base_url: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        jobs = []

        # ── Try card layout first ──────────────────────────────
        cards = soup.select(self._SEL_CARD)
        if cards:
            for card in cards:
                raw = self._card_to_dict(card, base_url)
                if raw:
                    jobs.append(raw)
            return jobs

        # ── Fallback: table row layout ─────────────────────────
        rows = soup.select(self._SEL_ROW)
        for row in rows:
            # skip header rows
            if row.find("th"):
                continue
            raw = self._row_to_dict(row, base_url)
            if raw:
                jobs.append(raw)

        # ── Last resort: any link containing an offer id ───────
        if not jobs:
            links = soup.find_all(
                "a",
                href=re.compile(r"(offre|concours|poste|emploi|detail)", re.I),
            )
            seen = set()
            for link in links:
                href = link.get("href", "")
                if href in seen or not href:
                    continue
                seen.add(href)
                title = link.get_text(strip=True)
                if len(title) < 5:
                    continue
                jobs.append({
                    "title":    title,
                    "company":  "Emploi Public Maroc",
                    "location": "",
                    "description": "",
                    "contract_type": "Concours",
                    "source_url": urljoin(base_url, href),
                    "deadline":  None,
                    "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                    "sector":    "public",
                })

        return jobs

    def _card_to_dict(self, card, base_url: str) -> Optional[dict]:
        """Extract fields from a card-style job element."""
        title_el = card.select_one(self._SEL_CARD_TITLE)
        if not title_el:
            return None
        title = title_el.get_text(strip=True)
        if not title:
            return None

        href       = title_el.get("href", "")
        source_url = urljoin(base_url, href) if href else None

        org_el  = card.select_one(self._SEL_CARD_ORG)
        company = org_el.get_text(strip=True) if org_el else "Emploi Public Maroc"

        loc_el   = card.select_one(self._SEL_CARD_LOC)
        location = loc_el.get_text(strip=True) if loc_el else ""

        date_el  = card.select_one(self._SEL_CARD_DATE)
        deadline = self._parse_date(date_el.get_text(strip=True) if date_el else "")
        expires_at = deadline or (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        desc_el = card.select_one(".description, .resume, .detail, p")
        description = clean_html(str(desc_el)) if desc_el else ""

        return {
            "title":         title,
            "company":       company or "Emploi Public Maroc",
            "location":      location,
            "description":   description,
            "contract_type": "Concours",
            "source_url":    source_url,
            "deadline":      deadline,
            "expires_at":    expires_at,
            "sector":        "public",
        }

    def _row_to_dict(self, row, base_url: str) -> Optional[dict]:
        """Extract fields from a table-row style job element."""
        title_el = row.select_one(self._SEL_ROW_TITLE)
        if not title_el:
            return None
        title = title_el.get_text(strip=True)
        if not title:
            return None

        href       = title_el.get("href", "")
        source_url = urljoin(base_url, href) if href else None

        org_el  = row.select_one(self._SEL_ROW_ORG)
        company = org_el.get_text(strip=True) if org_el else "Emploi Public Maroc"

        loc_el   = row.select_one(self._SEL_ROW_LOC)
        location = loc_el.get_text(strip=True) if loc_el else ""

        date_el  = row.select_one(self._SEL_ROW_DATE)
        deadline = self._parse_date(date_el.get_text(strip=True) if date_el else "")
        expires_at = deadline or (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        return {
            "title":         title,
            "company":       company or "Emploi Public Maroc",
            "location":      location,
            "description":   "",
            "contract_type": "Concours",
            "source_url":    source_url,
            "deadline":      deadline,
            "expires_at":    expires_at,
            "sector":        "public",
        }

    def parse_job(self, raw: dict) -> Optional[dict]:
        """Raw dict is already fully structured — just validate."""
        if not raw.get("title"):
            return None
        return raw

    def clean_data(self, job: dict) -> dict:
        """Override to preserve the sector and contract_type fields."""
        cleaned = super().clean_data(job)
        cleaned["sector"]       = job.get("sector", "public")
        cleaned["contract_type"] = job.get("contract_type") or "Concours"
        return cleaned

    # ── Date parsing ──────────────────────────────────────────

    def _parse_date(self, text: str) -> Optional[str]:
        """
        Parse French or numeric date formats into ISO strings.
        Accepts: "31/12/2026", "31 Décembre 2026", "2026-12-31"
        """
        if not text:
            return None

        MONTHS_FR = {
            "janvier": 1, "février": 2, "mars": 3, "avril": 4,
            "mai": 5, "juin": 6, "juillet": 7, "août": 8,
            "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12,
        }

        # DD/MM/YYYY
        m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
        if m:
            try:
                d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                return datetime(y, mo, d, tzinfo=timezone.utc).isoformat()
            except ValueError:
                pass

        # YYYY-MM-DD
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
        if m:
            try:
                y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
                return datetime(y, mo, d, tzinfo=timezone.utc).isoformat()
            except ValueError:
                pass

        # "15 Décembre 2026"
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
