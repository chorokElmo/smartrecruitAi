import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from . import fetch, empty_job

BASE = "https://www.rekrute.com"


def scrape(pages: int = 3) -> list[dict]:
    jobs: list[dict] = []
    for p in range(1, pages + 1):
        r = fetch(f"{BASE}/offres.html?p={p}&o=1")
        if not r:
            continue
        soup = BeautifulSoup(r.text, "lxml")
        cards = soup.select("li.post-id")
        if not cards:
            break
        for c in cards:
            links = [a for a in c.find_all("a", href=re.compile(r"/offre-emploi-")) if "#matching4K" not in a.get("href", "")]
            title_el = next((a for a in links if "titreJob" in (a.get("class") or [])), links[0] if links else None)
            if not title_el:
                continue
            raw = title_el.get_text(strip=True)
            title = raw.split("|")[0].strip()
            location = ""
            if "|" in raw:
                location = re.sub(r"\(.*?\)", "", raw.split("|", 1)[1]).strip()
            j = empty_job("rekrute")
            j["title"]   = title[:255]
            j["apply_url"] = urljoin(BASE, title_el.get("href", ""))
            j["location"] = location[:255]
            img = c.select_one(".col-sm-2 img[alt], img[alt]")
            j["company"] = (img["alt"].strip() if img and img.get("alt") else "Rekrute")[:255]
            desc = c.select_one(".description, p.info")
            j["description"] = (desc.get_text(" ", strip=True) if desc else "")[:5000]
            ct = c.get_text(" ", strip=True)
            for t in ("CDI", "CDD", "Stage", "Freelance"):
                if t.lower() in ct.lower():
                    j["contract_type"] = t
                    break
            if j["title"]:
                jobs.append(j)
    return jobs
