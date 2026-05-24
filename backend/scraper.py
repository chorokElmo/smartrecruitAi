"""
SmartRecruit AI — Rekrute.com Job Scraper
Fetches real Moroccan IT/tech job listings and inserts them into the database.

Usage:
    python scraper.py              # scrape + insert (default: 3 pages)
    python scraper.py --pages 5    # scrape 5 pages (~100 jobs)
    python scraper.py --dry-run    # scrape only, print jobs, no DB insert
"""

import re
import sys
import time
import argparse
import html as html_module
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

# ── DB setup ──────────────────────────────────────────────────────────────────
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models.job import Job
from app.ai.skill_extractor import extract_skills
import uuid

BASE_URL   = "https://www.rekrute.com"
# IT / Informatique & Télécommunication category on Rekrute
# s=3 → sorted by date, s1=1&s2=0 → IT sector, o=1 → all contract types
LIST_URL = BASE_URL + "/offres.html?s=3&p={page}&o=1&s1=1&s2=0"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def clean(text: str) -> str:
    """Strip HTML entities (double-encoded), tags, extra whitespace."""
    text = html_module.unescape(text or "")
    text = html_module.unescape(text)          # Rekrute double-encodes (&amp;rsquo; → &rsquo; → ')
    text = re.sub(r"<[^>]+>", " ", text)       # strip any leftover HTML tags
    text = re.sub(r"\s+", " ", text).strip()
    return text


def get_soup(url: str, retries: int = 3) -> BeautifulSoup | None:
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
            return BeautifulSoup(r.text, "lxml")
        except Exception as e:
            print(f"  [warn] attempt {attempt+1} failed for {url}: {e}")
            time.sleep(2 * (attempt + 1))
    return None


def meta(soup: BeautifulSoup, prop: str) -> str:
    tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
    return clean(tag["content"]) if tag and tag.get("content") else ""


# ── Step 1: collect job URLs from listing pages ─────────────────────────────

def get_job_urls(pages: int = 3) -> list[str]:
    urls = []
    seen = set()
    for page in range(1, pages + 1):
        print(f"[listing] page {page}/{pages} ...")
        soup = get_soup(LIST_URL.format(page=page))
        if not soup:
            continue
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/offre-emploi-" in href and href.endswith(".html"):
                full = urljoin(BASE_URL, href.split("?")[0])
                if full not in seen:
                    seen.add(full)
                    urls.append(full)
        time.sleep(1.2)
    print(f"[listing] found {len(urls)} unique job URLs")
    return urls


# ── Step 2: parse a job detail page ─────────────────────────────────────────

def parse_job(url: str) -> dict | None:
    soup = get_soup(url)
    if not soup:
        return None

    # Title — from <title> tag: "Offre d'emploi JOB_TITLE - COMPANY"
    page_title = clean(soup.title.string) if soup.title else ""
    # Remove "Offre d'emploi " prefix and " - COMPANY" suffix via og:title
    og_title = meta(soup, "og:title")

    # Parse "JOB TITLE - LOCATION - COMPANY" pattern from og:title or page title
    title = og_title or page_title
    # Remove site suffix like " | Rekrute" or " - Rekrute.com"
    title = re.sub(r"\s*[\|–-]\s*Rekrute.*$", "", title, flags=re.IGNORECASE).strip()
    # Remove "Offre d'emploi " prefix
    title = re.sub(r"^Offre\s+d[''`]?emploi\s+", "", title, flags=re.IGNORECASE).strip()

    # Try to extract location from title (last part after last " - ")
    location = ""
    parts = [p.strip() for p in title.split(" - ")]
    if len(parts) >= 2:
        # Common Moroccan cities in the title
        cities = ["Casablanca", "Rabat", "Marrakech", "Fès", "Fes", "Agadir",
                  "Tanger", "Oujda", "Meknès", "Meknes", "Kenitra", "Tétouan",
                  "Salé", "Sale", "Mohammedia", "El Jadida", "Plusieurs villes",
                  "Maroc", "Telecommande", "Télétravail", "Remote"]
        for part in reversed(parts):
            if any(city.lower() in part.lower() for city in cities):
                location = part
                break

    # Company from page <title>: "... - COMPANY" at end, or og:site_name
    company = ""
    # Try from <title> last segment
    title_tag = clean(soup.title.string) if soup.title else ""
    company_match = re.search(r"-\s*([^-]+)\s*$", title_tag)
    if company_match:
        candidate = company_match.group(1).strip()
        if "rekrute" not in candidate.lower() and len(candidate) > 2:
            company = candidate

    # Description from og:description meta
    description = meta(soup, "og:description")
    if not description:
        description = meta(soup, "description")

    # Contract type — look in description or URL
    contract_type = None
    text_lower = (title + " " + description).lower()
    if "cdi" in text_lower:
        contract_type = "CDI"
    elif "cdd" in text_lower:
        contract_type = "CDD"
    elif "stage" in text_lower or "intern" in text_lower:
        contract_type = "Stage"
    elif "freelance" in text_lower or "indépendant" in text_lower:
        contract_type = "Freelance"

    # Skip if no useful data
    if not title or not description or len(description) < 40:
        return None

    # Extract skills using our existing AI extractor
    full_text = f"{title} {description}"
    skills = extract_skills(full_text)

    return {
        "title":           title[:200],
        "company":         company[:200] if company else "Rekrute.com",
        "location":        location[:100] if location else "Maroc",
        "description":     description[:2000],
        "required_skills": skills,
        "contract_type":   contract_type,
        "source_url":      url,
        "source_name":     "Rekrute.com",
    }


# ── Step 3: insert into DB ────────────────────────────────────────────────────

def insert_jobs(jobs: list[dict], db: Session) -> int:
    # Get existing source URLs to avoid duplicates
    existing = {j.source_url for j in db.query(Job.source_url).all()}
    inserted = 0
    for j in jobs:
        if j["source_url"] in existing:
            continue
        record = Job(
            id             = uuid.uuid4(),
            title          = j["title"],
            company        = j["company"],
            location       = j["location"],
            description    = j["description"],
            required_skills= j["required_skills"],
            contract_type  = j["contract_type"],
            source_url     = j["source_url"],
            source_name    = j["source_name"],
            is_active      = True,
        )
        db.add(record)
        inserted += 1
    db.commit()
    return inserted


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape Rekrute.com jobs")
    parser.add_argument("--pages",   type=int, default=3, help="Number of listing pages (default 3 = ~60 jobs)")
    parser.add_argument("--dry-run", action="store_true",  help="Print jobs, do not insert into DB")
    args = parser.parse_args()

    print(f"\n=== SmartRecruit Scraper — Rekrute.com ===")
    print(f"Pages: {args.pages}  |  Dry-run: {args.dry_run}\n")

    # 1. Collect URLs
    job_urls = get_job_urls(pages=args.pages)
    if not job_urls:
        print("[error] No job URLs found. Exiting.")
        return

    # 2. Parse each job
    jobs = []
    for i, url in enumerate(job_urls, 1):
        print(f"[job {i:03d}/{len(job_urls)}] {url[-60:]}", end=" ... ")
        job = parse_job(url)
        if job:
            jobs.append(job)
            print(f"OK  skills={len(job['required_skills'])}  [{job['contract_type'] or '?'}]")
        else:
            print("SKIP (no data)")
        time.sleep(0.8)  # be polite to the server

    print(f"\n[scraped] {len(jobs)} valid jobs out of {len(job_urls)} URLs")

    if args.dry_run:
        print("\n--- DRY RUN — first 5 jobs ---")
        for j in jobs[:5]:
            print(f"  {j['title'][:60]}")
            print(f"    Company: {j['company']} | Location: {j['location']} | Type: {j['contract_type']}")
            print(f"    Skills:  {j['required_skills']}")
            print()
        return

    # 3. Insert into DB
    print("\n[db] inserting jobs ...")
    db = SessionLocal()
    try:
        count = insert_jobs(jobs, db)
        print(f"[db] inserted {count} new jobs (duplicates skipped)")
    finally:
        db.close()

    print("\n=== Done! Refresh your SmartRecruit dashboard to see real jobs. ===\n")


if __name__ == "__main__":
    main()
