import re
from bs4 import BeautifulSoup
from . import fetch, empty_job

BASE = "https://www.marocannonces.com"


def scrape(pages: int = 3) -> list[dict]:
    jobs: list[dict] = []
    seen = set()
    for p in range(1, pages + 1):
        url = f"{BASE}/maroc/offres-emploi-b309.html" + (f"?pge={p}" if p > 1 else "")
        r = fetch(url)
        if not r:
            continue
        soup = BeautifulSoup(r.text, "lxml")
        links = [a for a in soup.find_all("a", href=re.compile(r"/annonce/\d+/")) if a.get_text(strip=True)]
        if not links:
            break
        for a in links:
            href = a["href"]
            if href in seen:
                continue
            seen.add(href)
            txt = a.get_text(strip=True)
            j = empty_job("marocannonces")
            j["title"]     = txt[:120]
            j["apply_url"] = href if href.startswith("http") else BASE + "/" + href.lstrip("/")
            j["company"]   = "MarocAnnonces"
            m = re.search(r"(Casablanca|Rabat|Marrakech|Tanger|F[eè]s|Agadir|K[eé]nitra|Mekn[eè]s|Oujda|T[eé]touan|Mohammedia)", txt, re.I)
            if m:
                j["location"] = m.group(1)
            jobs.append(j)
    return jobs
