"""
Tanmia.ma scraper — Moroccan job board focused on entrepreneurship & tech.

SITE: https://tanmia.ma/offres-emploi/
LANGUAGE: French / Arabic
"""
import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.base_scraper import BaseScraper
from scraper.utils import safe_get, clean_html


class TanmiaScraper(BaseScraper):

    SOURCE_NAME   = "Tanmia.ma"
    BASE_URL      = "https://tanmia.ma"
    LISTING_URL   = "https://tanmia.ma/offres-emploi/"
    REQUEST_DELAY = 2.0
    MAX_PAGES     = 6
    JOBS_PER_PAGE = 10

    # Selectors — multiple fallbacks for resilience
    _SEL_CARD     = "article.job_listing, .job-listing, article.type-job_listing, li.job_listing"
    _SEL_TITLE    = "h3 a, h2 a, .job-title a, a.position"
    _SEL_COMPANY  = ".company strong, .company, h3.company, .job_listing-company"
    _SEL_LOCATION = ".location, .job-location, li.location"
    _SEL_CONTRACT = ".job-type, .type, .contract"
    _SEL_DATE     = ".date, time, .job-posted"

    def fetch_jobs(self) -> list[dict]:
        all_jobs: list[dict] = []
        with self.get_http_client() as client:
            client.headers.update({"Accept-Language": "fr-MA,fr;q=0.9"})
            for page in range(1, self.MAX_PAGES + 1):
                url = self.LISTING_URL if page == 1 else f"{self.LISTING_URL}page/{page}/"
                resp = safe_get(url, client, self.logger, self.rate_limiter)
                if resp is None:
                    break
                cards = self._parse_page(resp.text)
                if not cards:
                    self.logger.info(f"Page {page}: 0 cards — done")
                    break
                all_jobs.extend(cards)
                self.logger.info(f"Page {page}: {len(cards)} cards")
                if len(cards) < self.JOBS_PER_PAGE:
                    break
        self.logger.info(f"Total raw from Tanmia.ma: {len(all_jobs)}")
        return all_jobs

    def _parse_page(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select(self._SEL_CARD)
        if not cards:
            # fallback: any article/li with a job link
            cards = [t for t in soup.find_all(["article", "li"])
                     if t.find("a", href=re.compile(r"/offres-emploi/|/job/|/emploi/"))]
        return [r for c in cards if (r := self._card_to_dict(c))]

    def _card_to_dict(self, card) -> Optional[dict]:
        title_el = card.select_one(self._SEL_TITLE)
        if not title_el:
            title_el = card.find("a", href=re.compile(r"/offres-emploi/|/job/"))
        if not title_el:
            return None
        title = title_el.get_text(strip=True)
        href = title_el.get("href", "")
        if not title:
            return None

        source_url = urljoin(self.BASE_URL, href) if href else None

        company_el = card.select_one(self._SEL_COMPANY)
        company = company_el.get_text(strip=True) if company_el else "Tanmia.ma"

        loc_el = card.select_one(self._SEL_LOCATION)
        location = ""
        if loc_el:
            for i in loc_el.find_all("i"):
                i.decompose()
            location = loc_el.get_text(strip=True)

        contract_el = card.select_one(self._SEL_CONTRACT)
        contract_type = contract_el.get_text(strip=True) if contract_el else ""

        desc_el = card.select_one("p, .description, .excerpt, .content")
        description = clean_html(str(desc_el)) if desc_el else ""

        expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

        return {
            "title": title,
            "company": company or "Tanmia.ma",
            "location": location,
            "description": description,
            "contract_type": contract_type,
            "source_url": source_url,
            "deadline": None,
            "expires_at": expires_at,
            "sector": "private",
        }

    def parse_job(self, raw: dict) -> Optional[dict]:
        return raw if raw.get("title") else None
