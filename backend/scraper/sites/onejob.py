import re
from bs4 import BeautifulSoup
from . import fetch, empty_job

BASE = "https://www.onejob.ma"


def scrape(pages: int = 3) -> list[dict]:
    jobs: list[dict] = []
    seen = set()
    for p in range(1, pages + 1):
        r = fetch(f"{BASE}/offres-emploi?page={p}")
        if not r:
            continue
        soup = BeautifulSoup(r.text, "lxml")
        links = [a for a in soup.find_all("a", href=re.compile(r"/job/\d+/")) if a.get_text(strip=True)]
        if not links:
            break
        for a in links:
            href = a["href"]
            if href in seen:
                continue
            seen.add(href)
            j = empty_job("onejob")
            j["title"]     = a.get_text(strip=True)[:255]
            j["apply_url"] = href if href.startswith("http") else BASE + href
            j["company"]   = "OneJob"
            jobs.append(j)
    return jobs
