"""
LLM-powered extraction using Groq (llama-3.1-8b-instant).

Two public functions:
  extract_cv_data(text)          → CVExtraction  (skills, diploma, domain, years_experience)
  extract_job_requirements(text) → JobExtraction (required_skills, required_diploma, required_experience)

Both functions:
  1. Try the Groq LLM first (fast, free tier available).
  2. Validate the JSON response with Pydantic — rejects hallucinations.
  3. Fall back silently to the regex-based extractors if the key is missing,
     the API is down, the model returns invalid JSON, or any other error.

IMPORTANT: never raises — always returns a valid extraction object.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from pydantic import BaseModel, field_validator

logger = logging.getLogger(__name__)

# ── Lazy Groq client ──────────────────────────────────────────────────────────

_groq_client = None


def _get_groq_client():
    """Return a cached Groq client, or None if the key is not set."""
    global _groq_client
    if _groq_client is not None:
        return _groq_client

    from app.config import settings
    if not settings.GROQ_API_KEY:
        return None

    try:
        from groq import Groq
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info("[LLM] Groq client initialized (llama-3.1-8b-instant)")
    except Exception as exc:
        logger.warning("[LLM] Could not create Groq client: %s", exc)
        _groq_client = None

    return _groq_client


# ── Pydantic response schemas ─────────────────────────────────────────────────

class CVExtraction(BaseModel):
    """Structured data extracted from a CV."""
    skills:           list[str]      = []
    diploma:          Optional[str]  = None
    domain:           Optional[str]  = None
    years_experience: Optional[str]  = None

    @field_validator("skills", mode="before")
    @classmethod
    def clean_skills(cls, v):
        if not isinstance(v, list):
            return []
        return [s.strip() for s in v if isinstance(s, str) and s.strip()]

    @field_validator("diploma", "domain", "years_experience", mode="before")
    @classmethod
    def clean_str(cls, v):
        if not isinstance(v, str):
            return None
        v = v.strip()
        return v if v and v.lower() not in ("null", "none", "n/a", "unknown") else None


class JobExtraction(BaseModel):
    """Structured requirements extracted from a job description."""
    required_skills:     list[str]      = []
    required_diploma:    Optional[str]  = None
    required_experience: Optional[str]  = None

    @field_validator("required_skills", mode="before")
    @classmethod
    def clean_skills(cls, v):
        if not isinstance(v, list):
            return []
        return [s.strip() for s in v if isinstance(s, str) and s.strip()]

    @field_validator("required_diploma", "required_experience", mode="before")
    @classmethod
    def clean_str(cls, v):
        if not isinstance(v, str):
            return None
        v = v.strip()
        return v if v and v.lower() not in ("null", "none", "n/a", "unknown") else None


# ── Helper: call Groq and parse JSON ─────────────────────────────────────────

def _call_groq(system_prompt: str, user_content: str, model: str = "llama-3.1-8b-instant") -> dict:
    """
    Call the Groq API and return the parsed JSON dict.
    Raises on any error (caller handles fallback).
    """
    client = _get_groq_client()
    if client is None:
        raise RuntimeError("Groq client not available")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system",  "content": system_prompt},
            {"role": "user",    "content": user_content[:6000]},  # cap input tokens
        ],
        temperature=0.0,
        max_tokens=512,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


# ── CV extraction ─────────────────────────────────────────────────────────────

_CV_SYSTEM = """You are a CV parser. Extract structured data from the CV text.
Return ONLY valid JSON with these exact keys:
{
  "skills":           ["list", "of", "technical", "skills"],
  "diploma":          "highest diploma level (Master/Licence/Ingénieur/BTS/DUT/Bac or null)",
  "domain":           "professional domain in French (e.g. Développement web) or null",
  "years_experience": "number as string (e.g. '3' or '5+') or null"
}
Rules:
- skills: technology names only (Python, React, Docker…). Max 20.
- diploma: pick from [Doctorat, Master, Ingénieur, Licence Pro, Licence, Bac+5, Bac+3, Bac+2, DUT, BTS, Bac] or null.
- domain: one of [Développement logiciel, Développement web, Bases de données, DevOps & Cloud,
  Intelligence artificielle, Compétences générales, Outils & Méthodes, Data & Analyse,
  Réseaux & Sécurité, Développement mobile, ERP & CRM] or null.
- years_experience: total years only, no text. Append '+' if 10 or more.
- Return null (not empty string) when information is not present.
"""


def extract_cv_data(text: str) -> CVExtraction:
    """
    Extract structured CV data via Groq LLM with regex fallback.
    Never raises — always returns a CVExtraction.
    """
    if not text or not text.strip():
        return CVExtraction()

    # ── Try LLM ──────────────────────────────────────────────
    try:
        raw = _call_groq(_CV_SYSTEM, f"CV TEXT:\n{text}")
        result = CVExtraction.model_validate(raw)
        logger.info(
            "[LLM] CV extracted — %d skills, diploma=%s, domain=%s, exp=%s",
            len(result.skills), result.diploma, result.domain, result.years_experience,
        )
        return result
    except Exception as exc:
        logger.debug("[LLM] CV extraction failed, using regex fallback: %s", exc)

    # ── Regex fallback ────────────────────────────────────────
    from app.ai.skill_extractor import extract_skills
    from app.ai.cv_enricher import extract_diploma, extract_domain, extract_experience

    skills = extract_skills(text)
    return CVExtraction(
        skills=skills,
        diploma=extract_diploma(text),
        domain=extract_domain(skills) if skills else None,
        years_experience=extract_experience(text),
    )


# ── Job requirements extraction ───────────────────────────────────────────────

_JOB_SYSTEM = """You are a job posting parser. Extract requirements from the job description.
Return ONLY valid JSON with these exact keys:
{
  "required_skills":     ["list", "of", "required", "technical", "skills"],
  "required_diploma":    "minimum diploma required (Master/Licence/Ingénieur/BTS/DUT/Bac or null)",
  "required_experience": "required years as string (e.g. '2', '3+') or null"
}
Rules:
- required_skills: only concrete technologies/tools/languages. Max 15.
- required_diploma: use same scale as before or null if not specified.
- required_experience: extract the minimum years required. Append '+' if 5 or more.
- Return null when information is not mentioned.
"""

# Regex fallback patterns for job requirements
_SKILL_KEYWORDS = re.compile(
    r"\b(python|javascript|typescript|java|go|rust|php|ruby|swift|kotlin|scala|"
    r"react|vue|angular|next\.?js|node\.?js|django|flask|fastapi|spring|laravel|rails|"
    r"docker|kubernetes|aws|azure|gcp|linux|git|postgresql|mysql|mongodb|redis|"
    r"tensorflow|pytorch|scikit-learn|pandas|numpy|sql|html|css|rest|graphql|"
    r"jenkins|ansible|terraform|nginx|elasticsearch)\b",
    re.IGNORECASE,
)

_EXP_PATTERN = re.compile(
    r"(\d+)\s*(?:ans?|years?|an)\s*(?:d[e']|of|minimum|mini)?[^\n]{0,30}exp[eé]r",
    re.IGNORECASE,
)


def extract_job_requirements(description: str) -> JobExtraction:
    """
    Extract required_skills, required_diploma, required_experience from a job description.
    Tries LLM first, falls back to regex. Never raises.
    """
    if not description or not description.strip():
        return JobExtraction()

    # ── Try LLM ──────────────────────────────────────────────
    try:
        raw = _call_groq(_JOB_SYSTEM, f"JOB DESCRIPTION:\n{description}")
        result = JobExtraction.model_validate(raw)
        logger.debug(
            "[LLM] Job extracted — %d skills, diploma=%s, exp=%s",
            len(result.required_skills), result.required_diploma, result.required_experience,
        )
        return result
    except Exception as exc:
        logger.debug("[LLM] Job extraction failed, using regex fallback: %s", exc)

    # ── Regex fallback ────────────────────────────────────────
    lower = description.lower()

    # Skills
    found = list(dict.fromkeys(  # deduplicate preserving order
        m.group(0).lower().capitalize()
        for m in _SKILL_KEYWORDS.finditer(description)
    ))[:15]

    # Experience
    exp_match = _EXP_PATTERN.search(lower)
    years_str: Optional[str] = None
    if exp_match:
        y = int(exp_match.group(1))
        years_str = f"{y}+" if y >= 5 else str(y)

    # Diploma (reuse cv_enricher patterns)
    from app.ai.cv_enricher import extract_diploma
    diploma = extract_diploma(description)

    return JobExtraction(
        required_skills=found,
        required_diploma=diploma,
        required_experience=years_str,
    )
