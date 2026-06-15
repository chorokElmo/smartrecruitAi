import re
from bs4 import BeautifulSoup
from . import fetch, empty_job

BASE = "https://www.emploi-public.ma"


def scrape(pages: int = 3) -> list[dict]:
    jobs: list[dict] = []
    seen = set()
    r = fetch(f"{BASE}/fr/concours-liste")
    if not r:
        return jobs
    soup = BeautifulSoup(r.text, "lxml")
    links = [a for a in soup.find_all("a", href=True)
             if re.search(r"/concours/|/concour|/offre", a["href"], re.I) and len(a.get_text(strip=True)) > 12]
    for a in links:
        href = a["href"]
        if href in seen:
            continue
        seen.add(href)
        j = empty_job("emploi_public")
        j["title"]     = a.get_text(strip=True)[:255]
        j["apply_url"] = href if href.startswith("http") else BASE + href
        j["company"]   = "Secteur Public"
        j["contract_type"] = "Concours"
        jobs.append(j)
    return jobs
