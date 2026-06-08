"""
LiveMatchService — Real-time job matching from Moroccan websites.

Pipeline (every time the user clicks "Lancer la recherche"):
  1. Scrape live listing pages from Rekrute.ma  (fast — cards only)
  2. Score EVERY job locally with sentence-transformer embeddings:
       - skill overlap (user skills found in title + description)
       - semantic title similarity (user domain/skills vs job title)
       - diploma fit
     → This always produces results. It is real AI (384-dim embeddings).
  3. Keep the top candidates, then visit their detail pages to read the
     exact diploma (Bac+5), experience level, and deadline.
  4. Re-score with the diploma penalty, generate a natural-language
     explanation (Groq if available, template otherwise).
  5. Return results sorted by score.

Design principle: the embedding scorer is the reliable backbone — Groq is
optional polish that never blocks or breaks the results.
"""
from __future__ import annotations

import logging
import re
import uuid
from typing import Optional

import numpy as np
from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.core.exceptions import BadRequestError, NotFoundError
from app.ai.embedder import encode

logger = logging.getLogger(__name__)

# ── Tunables ──────────────────────────────────────────────────────────────────
SCRAPE_PAGES   = 6     # listing pages to scrape (~60 jobs)
TOP_CANDIDATES = 12    # how many top jobs get detail-page enrichment + Groq score
MIN_SCORE      = 30    # hide clearly-irrelevant jobs (non-tech for a dev sink to ~20)
MAX_RESULTS    = 12    # max jobs returned

# Diploma seniority — higher = more qualified
DIPLOMA_RANK = {
    "Doctorat": 7,
    "Master": 6, "Ingénieur": 6, "Bac+5": 6,
    "Licence": 5, "Licence Pro": 5, "Bac+4": 5, "Bac+3": 5,
    "BTS": 4, "DUT": 4, "Bac+2": 4,
    "Bac": 3,
}

# Common tech skill vocabulary for keyword overlap on descriptions
_TECH_VOCAB = re.compile(
    r"\b(python|java(?:script)?|typescript|php|c\+\+|c#|go|ruby|swift|kotlin|"
    r"react|vue|angular|next\.?js|node\.?js|django|flask|fastapi|spring|laravel|symfony|"
    r"\.net|express|rails|docker|kubernetes|k8s|aws|azure|gcp|terraform|ansible|jenkins|"
    r"linux|git|ci/cd|devops|sql|mysql|postgresql|postgres|mongodb|oracle|redis|"
    r"html|css|tailwind|bootstrap|sass|machine learning|deep learning|tensorflow|pytorch|"
    r"pandas|numpy|scikit|data|power bi|tableau|excel|sap|salesforce|odoo|"
    r"agile|scrum|rest|graphql|api|microservices|cybersecurity|sécurité|réseau|network)\b",
    re.IGNORECASE,
)


class LiveMatchService:
    def __init__(self, db: Session):
        self.db        = db
        self.user_repo = UserRepository(db)

    # ── Public entry point ────────────────────────────────────────────────────

    def search(self, user_id: str, max_pages: int = SCRAPE_PAGES) -> list[dict]:
        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("User")
        if not user.skills and not user.domain and not user.diploma:
            raise BadRequestError(
                "Complétez votre profil (compétences, diplôme ou domaine) "
                "ou uploadez votre CV avant de lancer la recherche."
            )

        profile = {
            "name":     f"{user.first_name} {user.last_name}",
            "diploma":  user.diploma or "",
            "domain":   user.domain or "",
            "years":    user.years_experience or "",
            "skills":   [s for s in (user.skills or []) if s],
        }
        logger.info(
            "[LiveMatch] user=%s diploma=%s domain=%s skills=%d",
            user_id[:8], profile["diploma"], profile["domain"], len(profile["skills"])
        )

        # 1. Scrape listing cards
        jobs = self._scrape_listings(max_pages)
        logger.info("[LiveMatch] Scraped %d jobs", len(jobs))
        if not jobs:
            return []

        # 2. Local embedding score for ALL jobs (reliable backbone)
        self._score_all_local(profile, jobs)
        jobs.sort(key=lambda j: j["score"], reverse=True)

        # 3. Enrich the top candidates with detail-page data
        top = jobs[:TOP_CANDIDATES]
        self._enrich_top(top)

        # 4. Re-apply diploma penalty + generate explanations after enrichment
        self._finalize(profile, top)

        # 5. Filter, sort, cap
        top.sort(key=lambda j: j["score"], reverse=True)
        results = [j for j in top if j["score"] >= MIN_SCORE][:MAX_RESULTS]
        logger.info("[LiveMatch] Returning %d results", len(results))
        return results

    # ── 1. Scrape listing cards ───────────────────────────────────────────────

    def _scrape_listings(self, max_pages: int) -> list[dict]:
        jobs: list[dict] = []
        try:
            from scraper.rekrute_scraper import RekruteScraper
            from scraper.utils import safe_get, get_http_client

            scraper = RekruteScraper(self.db)
            scraper.REQUEST_DELAY = 0.4          # faster for live request
            scraper.rate_limiter.delay = 0.4

            seen = set()
            with get_http_client("Rekrute") as client:
                for page in range(1, max_pages + 1):
                    url  = f"{scraper.LISTING_URL}?p={page}&o=1"
                    resp = safe_get(url, client, scraper.logger, scraper.rate_limiter)
                    if resp is None:
                        break
                    cards = scraper._extract_cards_from_page(resp.text, scraper.BASE_URL)
                    if not cards:
                        break
                    for raw in cards:
                        parsed = scraper.parse_job(raw)
                        if not parsed or not parsed.get("title"):
                            continue
                        cleaned = scraper.clean_data(parsed)
                        url_key = cleaned.get("source_url") or cleaned["title"]
                        if url_key in seen:
                            continue
                        seen.add(url_key)
                        jobs.append(cleaned)
                    if len(cards) < scraper.JOBS_PER_PAGE:
                        break
        except Exception as exc:
            logger.warning("[LiveMatch] Scrape failed: %s", exc)
        return jobs

    # ── 2. Card-level ranking (title only — cards have no description) ─────────

    def _build_reference(self, profile: dict) -> str:
        """
        Build a role-anchored reference phrase for semantic title matching.

        A raw skill list ("Django React") embeds poorly against French job
        titles. A role phrase ("développeur ingénieur informatique …") embeds
        much closer to real tech titles, giving clean tech-vs-non-tech
        separation.
        """
        if profile["domain"]:
            base = profile["domain"]
        else:
            base = "développeur ingénieur informatique logiciel web data"
        return f"{base} {' '.join(profile['skills'][:10])}".strip()

    def _score_all_local(self, profile: dict, jobs: list[dict]) -> None:
        """
        Card-level score (0-100) from the TITLE only — used to rank candidates.
        Real skill matching happens later in _finalize once descriptions exist.
        """
        ref_text = self._build_reference(profile)
        skills_lower = {s.lower() for s in profile["skills"]}

        titles = [j.get("title", "") for j in jobs]
        try:
            vecs       = encode([ref_text] + titles)
            ref_vec    = vecs[0]
            title_sims = vecs[1:] @ ref_vec
        except Exception as exc:
            logger.warning("[LiveMatch] Embedding failed: %s", exc)
            title_sims = np.full(len(jobs), 0.3)

        for i, job in enumerate(jobs):
            title_lower = job.get("title", "").lower()

            # Scaled semantic similarity (sims top out ~0.45 → scale to use 0-1)
            sim    = float(np.clip(title_sims[i], 0.0, 1.0))
            scaled = min(1.0, sim * 2.2)

            # Keyword bonus: title contains a user skill or a tech-vocab word
            has_user_skill = any(s in title_lower for s in skills_lower)
            has_tech_word  = bool(_TECH_VOCAB.search(title_lower))
            kw_bonus = 0.18 if (has_user_skill or has_tech_word) else 0.0

            card_score = min(1.0, scaled + kw_bonus)
            job["score"]        = int(round(card_score * 100))
            job["_title_score"] = sim

    # ── 3. Detail-page enrichment for top candidates ──────────────────────────

    def _enrich_top(self, jobs: list[dict]) -> None:
        try:
            from scraper.rekrute_scraper import RekruteScraper
            from scraper.utils import get_http_client

            scraper = RekruteScraper(self.db)
            scraper.REQUEST_DELAY = 0.4
            scraper.rate_limiter.delay = 0.4

            with get_http_client("Rekrute-detail") as client:
                for job in jobs:
                    url = job.get("source_url", "")
                    if not url or "rekrute.com" not in url:
                        continue
                    try:
                        d = scraper.fetch_detail_page(url, client)
                    except Exception:
                        continue
                    if d.get("required_diploma"):
                        job["required_diploma"] = d["required_diploma"]
                    if d.get("required_experience"):
                        job["required_experience"] = d["required_experience"]
                    if d.get("deadline"):
                        job["deadline"] = d["deadline"]
                    if d.get("remote_work") is not None:
                        job["remote_work"] = d["remote_work"]
                    if d.get("full_description") and len(d["full_description"]) > len(job.get("description", "")):
                        job["description"] = d["full_description"]
        except Exception as exc:
            logger.warning("[LiveMatch] Enrichment failed: %s", exc)

    # ── 4. Finalize: diploma penalty + explanation ────────────────────────────

    def _finalize(self, profile: dict, jobs: list[dict]) -> None:
        """
        Score each top job with Groq AI (semantic understanding of the full
        description, diploma, experience) — one reliable call per job.
        Falls back to the local embedding/keyword scorer if Groq is unavailable.
        """
        from app.ai.llm_extractor import _get_groq_client
        client = _get_groq_client()

        for job in jobs:
            scored = False
            if client is not None:
                scored = self._groq_score_one(client, profile, job)
            if not scored:
                self._local_score_one(profile, job)

    def _groq_score_one(self, client, profile: dict, job: dict) -> bool:
        """Score ONE job with Groq. Returns True on success, False to fall back."""
        import json
        try:
            desc = (job.get("description") or "")[:1200]
            prompt = (
                "Tu es un recruteur expert au Maroc. Évalue la compatibilité entre "
                "ce candidat et cette offre d'emploi.\n\n"
                f"CANDIDAT:\n"
                f"- Diplôme: {profile['diploma'] or 'non précisé'}\n"
                f"- Domaine: {profile['domain'] or 'non précisé'}\n"
                f"- Expérience: {profile['years'] or 'non précisé'} ans\n"
                f"- Compétences: {', '.join(profile['skills'][:12]) or 'non précisées'}\n\n"
                f"OFFRE:\n"
                f"- Titre: {job.get('title','')}\n"
                f"- Diplôme requis: {job.get('required_diploma') or 'non précisé'}\n"
                f"- Expérience requise: {job.get('required_experience') or 'non précisé'}\n"
                f"- Description: {desc}\n\n"
                "Donne un score 0-100 (compétences transférables comptent). "
                "Pénalise si le candidat n'a pas le diplôme requis. "
                "Réponds en JSON strict: "
                '{"score": <0-100>, "explanation": "<1 phrase en français>", '
                '"matching_skills": ["..."], "missing_skills": ["..."]}'
            )
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=400,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content or "{}")
            score = int(data.get("score", -1))
            if score < 0:
                return False
            job["score"]           = min(100, max(0, score))
            job["explanation"]     = data.get("explanation", "")
            job["matching_skills"] = data.get("matching_skills", []) or []
            job["missing_skills"]  = data.get("missing_skills", []) or []
            return True
        except Exception as exc:
            logger.debug("[LiveMatch] Groq score failed for '%s': %s", job.get("title","")[:30], exc)
            return False

    def _local_score_one(self, profile: dict, job: dict) -> None:
        """Embedding + keyword fallback scorer for a single job."""
        skills_lower = {s.lower() for s in profile["skills"]}
        text    = f"{job.get('title','')} {job.get('description','')}".lower()
        matched = sorted({s for s in skills_lower if s in text})

        if skills_lower:
            skill_score = len(matched) / len(skills_lower)
            if skill_score == 0:
                # transferable tech relevance via keyword density
                tech_hits   = len({m.group(0).lower() for m in _TECH_VOCAB.finditer(text)})
                skill_score = min(0.6, tech_hits * 0.1)
        else:
            tech_hits   = len({m.group(0).lower() for m in _TECH_VOCAB.finditer(text)})
            skill_score = min(1.0, tech_hits * 0.12)

        title_score = min(1.0, job.get("_title_score", 0.3) * 2.2)

        user_rank = DIPLOMA_RANK.get(profile["diploma"], 4)
        req_dip   = job.get("required_diploma")
        diploma_note = ""
        if req_dip and req_dip in DIPLOMA_RANK:
            job_rank = DIPLOMA_RANK[req_dip]
            if user_rank >= job_rank:
                diploma_fit = 1.0
            else:
                diploma_fit  = max(0.3, user_rank / job_rank)
                diploma_note = f"⚠ Requiert {req_dip}" + (f" (vous: {profile['diploma']})" if profile['diploma'] else "")
        else:
            diploma_fit = 0.7

        final = skill_score * 0.50 + title_score * 0.40 + diploma_fit * 0.10
        job["score"]           = int(round(final * 100))
        job["matching_skills"] = [s for s in profile["skills"] if s.lower() in matched]
        job.setdefault("missing_skills", [])

        sc = job["score"]
        if   sc >= 70: base = "Excellente correspondance avec votre profil"
        elif sc >= 50: base = "Bonne correspondance — domaine proche du vôtre"
        elif sc >= 30: base = "Correspondance partielle — compétences transférables"
        else:          base = "Correspondance faible"
        if job["matching_skills"]:
            base += f" · compétences communes: {', '.join(job['matching_skills'][:4])}"
        if diploma_note:
            base += f" · {diploma_note}"
        job["explanation"] = base
