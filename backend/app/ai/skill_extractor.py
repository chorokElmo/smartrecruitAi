"""
Extract skills from raw CV text using keyword matching against our taxonomy.
No heavy ML dependencies required — works with pure Python.
"""
import json
import re
from pathlib import Path

_TAXONOMY_PATH = Path(__file__).parent / "data" / "skills_taxonomy.json"
_ALL_SKILLS: list[str] = []


def find_email(text: str) -> str | None:
    if not text:
        return None
    m = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    if m:
        return m.group(0)
    m = re.search(r"[\w\.-]+\s*@\s*[\w\.-]+\s*\.\s*\w+", text)
    if m:
        return re.sub(r"\s+", "", m.group(0))
    return None


def find_name_fallback(text: str) -> str | None:
    for line in (text or "").splitlines():
        s = line.strip()
        if not s or "@" in s:
            continue
        if re.search(r"https?://|www\.|linkedin|github|\d", s, re.I):
            continue
        words = s.split()
        if 1 < len(words) < 5 and re.match(r"^[A-Za-zÀ-ÿ' .-]+$", s):
            return s
    return None


def extract_contact_info(text: str) -> dict:
    """Regex fallback for name + email from raw CV text."""
    return {"name": find_name_fallback(text), "email": find_email(text)}


def _load_skills() -> list[str]:
    global _ALL_SKILLS
    if _ALL_SKILLS:
        return _ALL_SKILLS
    with open(_TAXONOMY_PATH, encoding="utf-8") as f:
        taxonomy: dict[str, list[str]] = json.load(f)
    skills = []
    for category_skills in taxonomy.values():
        skills.extend(category_skills)
    # Deduplicate taxonomy (some skills appear in multiple categories)
    _ALL_SKILLS = list(dict.fromkeys(skills))
    return _ALL_SKILLS


def extract_skills(text: str) -> list[str]:
    """
    Return a deduplicated list of skills found in `text`.
    Matching is case-insensitive and uses word boundaries.
    """
    if not text:
        return []

    all_skills = _load_skills()
    text_lower = text.lower()
    found: list[str] = []
    seen: set[str] = set()

    for skill in all_skills:
        # Build a regex pattern with word boundaries for accurate matching
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower) and skill not in seen:
            found.append(skill)
            seen.add(skill)

    return found
