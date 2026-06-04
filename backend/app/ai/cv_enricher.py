"""
Richer CV enrichment: diploma, domain, years_experience.

STRICT RULES:
  - Never guess. Return None if not found.
  - extract_diploma: regex over known degree keywords only
  - extract_domain:  majority vote over taxonomy categories
  - extract_experience: regex over common date/year patterns → integer years
"""
import json
import re
from pathlib import Path
from typing import Optional

_TAXONOMY_PATH = Path(__file__).parent / "data" / "skills_taxonomy.json"
_TAXONOMY: dict[str, list[str]] | None = None


def _get_taxonomy() -> dict[str, list[str]]:
    global _TAXONOMY
    if _TAXONOMY is None:
        with open(_TAXONOMY_PATH, encoding="utf-8") as f:
            _TAXONOMY = json.load(f)
    return _TAXONOMY


# ── 1. Diploma ────────────────────────────────────────────────────────────────

# Ordered from most specific to least so "Master en informatique"
# matches "Master" before matching "Bac".
_DIPLOMA_PATTERNS: list[tuple[str, str]] = [
    (r"\bdoctorat\b|\bphd\b|\bthèse\b",                      "Doctorat"),
    (r"\bmaster\b|\bm2\b|\bm1\b|\bdiplôme\s+d[eu]\s+master\b", "Master"),
    (r"\bing[eé]nieur\b|\bdi[ph]l[oô]me\s+d[\'']ing[eé]nieur\b", "Ingénieur"),
    (r"\blicence\s+professionnelle\b",                        "Licence Pro"),
    (r"\blicence\b|\bbach?elor\b|\bba\b|\bbsc\b|\bl3\b",      "Licence"),
    (r"\bbac\s*\+\s*5\b",                                     "Bac+5"),
    (r"\bbac\s*\+\s*3\b",                                     "Bac+3"),
    (r"\bbac\s*\+\s*2\b",                                     "Bac+2"),
    (r"\bdut\b",                                              "DUT"),
    (r"\bbts\b",                                              "BTS"),
    (r"\bbac\b",                                              "Bac"),
]


def extract_diploma(text: str) -> Optional[str]:
    """
    Detect degree level from CV text.
    Returns the most specific diploma found, or None.

    Examples:
      "Master en informatique"          → "Master"
      "Diplôme d'ingénieur"            → "Ingénieur"
      "BTS Comptabilité"               → "BTS"
      "Expérimenté en Python"          → None
    """
    if not text:
        return None
    lower = text.lower()
    for pattern, label in _DIPLOMA_PATTERNS:
        if re.search(pattern, lower, re.IGNORECASE):
            return label
    return None


# ── 2. Domain ─────────────────────────────────────────────────────────────────

_DOMAIN_LABELS: dict[str, str] = {
    "programming_languages": "Développement logiciel",
    "web_frameworks":        "Développement web",
    "databases":             "Bases de données",
    "devops":                "DevOps & Cloud",
    "ai_ml":                 "Intelligence artificielle",
    "soft_skills":           "Compétences générales",
    "tools":                 "Outils & Méthodes",
    "data":                  "Data & Analyse",
    "networks_security":     "Réseaux & Sécurité",
    "mobile":                "Développement mobile",
    "erp_crm":               "ERP & CRM",
}


def extract_domain(skills: list[str]) -> Optional[str]:
    """
    Classify the candidate's primary domain from their skill list.
    Returns the human-readable label for the most represented taxonomy
    category, or None if no skills are present.

    Example:
      skills=["Python", "Django", "React", "PostgreSQL"]
      → programming_languages(1) + web_frameworks(2) + databases(1)
      → "Développement web"
    """
    if not skills:
        return None

    taxonomy = _get_taxonomy()
    skill_set = {s.lower() for s in skills}

    # Count how many user skills belong to each category
    counts: dict[str, int] = {}
    for category, cat_skills in taxonomy.items():
        hit = sum(1 for s in cat_skills if s.lower() in skill_set)
        if hit:
            counts[category] = hit

    if not counts:
        return None

    best = max(counts, key=lambda k: counts[k])
    return _DOMAIN_LABELS.get(best, best)


# ── 3. Years of experience ────────────────────────────────────────────────────

_CURRENT_YEAR = 2026   # fixed to avoid datetime import at module level


def extract_experience(text: str) -> Optional[str]:
    """
    Extract years of experience from CV text.
    Returns a string like "3" or "5+" or None.

    Patterns matched:
      "3 ans d'expérience"   → "3"
      "5 years of experience"→ "5"
      "plus de 7 ans"        → "7+"
      "depuis 2019"          → str(2026-2019) = "7"
      "2018 – 2023"          → "5" (duration inferred)
      null if nothing found
    """
    if not text:
        return None
    lower = text.lower()

    # Pattern: "X ans" or "X years" or "X year"
    m = re.search(
        r"(\d+)\s*(?:ans?|years?)\s*(?:d[e']|of|d\')?[^\n]{0,20}exp[eé]r",
        lower,
    )
    if m:
        years = int(m.group(1))
        return f"{years}+"if years >= 10 else str(years)

    # Pattern: "plus de X ans"
    m = re.search(r"plus\s+de\s+(\d+)\s*ans", lower)
    if m:
        return f"{int(m.group(1))}+"

    # Pattern: "depuis YYYY" → current year - YYYY
    m = re.search(r"depuis\s+(20\d{2}|19\d{2})", lower)
    if m:
        years = _CURRENT_YEAR - int(m.group(1))
        if 0 < years < 50:
            return str(years)

    # Pattern: "YYYY – YYYY" or "YYYY - YYYY" (last occurrence)
    spans = re.findall(r"(20\d{2}|19\d{2})\s*[-–]\s*(20\d{2}|19\d{2}|present|actuel)", lower)
    if spans:
        # sum durations of all detected experience spans
        total = 0
        for start, end in spans:
            s = int(start)
            e = _CURRENT_YEAR if end in ("present", "actuel") else int(end)
            if 0 < (e - s) < 50:
                total += e - s
        if total > 0:
            return f"{total}+"if total >= 10 else str(total)

    return None
