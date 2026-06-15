import re
from bs4 import BeautifulSoup
from . import fetch, empty_job

BASE = "https://www.emploi.ma"


def scrape(pages: int = 3) -> list[dict]:
    jobs: list[dict] = []
    seen = set()
    for p in range(1, pages + 1):
        r = fetch(f"{BASE}/recherche-jobs-maroc?page={p}")
        if not r:
            continue
        soup = BeautifulSoup(r.text, "lxml")
        cards = soup.select(".card-job")
        if not cards:
            break
        for c in cards:
            a = c.select_one("h3 a[href], a.card-job-link[href], h2 a[href]")
            if not a:
                a = next((x for x in c.find_all("a", href=True) if "/offre" in x["href"] and x.get_text(strip=True)), None)
            if not a:
                continue
            href = a["href"]
            if href in seen:
                continue
            seen.add(href)
            j = empty_job("emploi_ma")
            j["title"]     = a.get_text(strip=True)[:255]
            j["apply_url"] = href if href.startswith("http") else BASE + href
            comp = c.select_one(".card-job-company, .recruiter-name, a[href*='/recruteur']")
            j["company"]   = (comp.get_text(strip=True) if comp else "Emploi.ma")[:255]
            loc = c.select_one("[class*=location], .card-job-detail")
            if loc:
                j["location"] = loc.get_text(strip=True)[:255]
            if j["title"]:
                jobs.append(j)
    return jobs
