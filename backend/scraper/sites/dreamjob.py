import re
from bs4 import BeautifulSoup
from . import fetch, empty_job

BASE = "https://www.dreamjob.ma"


def scrape(pages: int = 3) -> list[dict]:
    jobs: list[dict] = []
    seen = set()
    for p in range(1, pages + 1):
        url = f"{BASE}/emploi/" + (f"page/{p}/" if p > 1 else "")
        r = fetch(url)
        if not r:
            continue
        soup = BeautifulSoup(r.text, "lxml")
        items = soup.select("h3 a, article h2 a, h2.entry-title a")
        for a in items:
            href = a.get("href", "")
            txt  = a.get_text(strip=True)
            if not href or not txt or href in seen:
                continue
            # keep real job posts, skip category/region links
            if re.search(r"/emploi-|/category|/tag/|/emploi/$", href):
                continue
            if not re.search(r"dreamjob\.ma/[a-z0-9-]{8,}", href):
                continue
            seen.add(href)
            j = empty_job("dreamjob")
            j["title"]     = txt[:255]
            j["apply_url"] = href if href.startswith("http") else BASE + href
            j["company"]   = "DreamJob"
            jobs.append(j)
    return jobs
