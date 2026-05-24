"""
Extract skills from raw CV text using keyword matching against our taxonomy.
No heavy ML dependencies required — works with pure Python.
"""
import json
import re
from pathlib import Path

_TAXONOMY_PATH = Path(__file__).parent / "data" / "skills_taxonomy.json"
_ALL_SKILLS: list[str] = []


def _load_skills() -> list[str]:
    global _ALL_SKILLS
    if _ALL_SKILLS:
        return _ALL_SKILLS
    with open(_TAXONOMY_PATH, encoding="utf-8") as f:
        taxonomy: dict[str, list[str]] = json.load(f)
    skills = []
    for category_skills in taxonomy.values():
        skills.extend(category_skills)
    _ALL_SKILLS = skills
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

    for skill in all_skills:
        # Build a regex pattern with word boundaries for accurate matching
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)

    return found
