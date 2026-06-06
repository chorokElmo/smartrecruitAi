"""
LiveMatchService — Real-time job matching pipeline.

Flow (triggered each time the user clicks "Find Matching Jobs"):
  1. Scrape LIVE from Moroccan job websites (Rekrute, Emploi.ma, emploi-public.ma)
     → always fresh, never from the cached database
  2. For each scraped job, Groq AI reads the FULL content:
       title, description, required diploma, domain, required experience
  3. Groq scores each job against the user's complete profile:
       diploma, domain, years_experience, skills
  4. Returns ranked results with score + explanation + missing fields

Fallback (no Groq key): uses regex + sentence-transformer scoring on full text.
"""
from __future__ import annotations

import json
import logging
import uuid
from textwrap import dedent
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.core.exceptions import BadRequestError, NotFoundError

logger = logging.getLogger(__name__)

# ── Live result schema ────────────────────────────────────────────────────────

class LiveJobMatch:
    """One job result returned by the live matching pipeline."""
    def __init__(
        self,
        title:          str,
        company:        str,
        location:       str,
        description:    str,
        source_name:    str,
        source_url:     str,
        sector:         str,
        contract_type:  Optional[str],
        score:          float,           # 0–100
        explanation:    str,
        matching_skills: list[str],
        missing_skills:  list[str],
        required_diploma:    Optional[str],
        required_experience: Optional[str],
    ):
        self.title               = title
        self.company             = company
        self.location            = location
        self.description         = description
        self.source_name         = source_name
        self.source_url          = source_url
        self.sector              = sector
        self.contract_type       = contract_type
        self.score               = score
        self.explanation         = explanation
        self.matching_skills     = matching_skills
        self.missing_skills      = missing_skills
        self.required_diploma    = required_diploma
        self.required_experience = required_experience

    def to_dict(self) -> dict:
        return self.__dict__


# ── Main service ──────────────────────────────────────────────────────────────

class LiveMatchService:
    def __init__(self, db: Session):
        self.db        = db
        self.user_repo = UserRepository(db)

    def search(self, user_id: str, max_pages: int = 3) -> list[dict]:
        """
        Scrape Moroccan job sites in real-time and return AI-ranked matches.

        Args:
            user_id:   authenticated user's UUID string
            max_pages: how many Rekrute pages to scrape (default 3 → ~30 jobs)

        Returns:
            list of LiveJobMatch.to_dict(), sorted by score descending
        """
        # 1. Load user profile
        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("User")
        if not user.skills and not user.domain and not user.diploma:
            raise BadRequestError(
                "Complétez votre profil (compétences, diplôme, domaine) "
                "ou uploadez votre CV avant de lancer la recherche."
            )

        profile = {
            "name":             f"{user.first_name} {user.last_name}",
            "diploma":          user.diploma          or "non précisé",
            "domain":           user.domain           or "non précisé",
            "years_experience": user.years_experience or "non précisé",
            "skills":           user.skills or [],
        }

        logger.info(
            "[LiveMatch] Starting for user %s — diploma=%s domain=%s skills=%d",
            user_id[:8], profile["diploma"], profile["domain"], len(profile["skills"])
        )

        # 2. Scrape live from Moroccan websites
        raw_jobs = self._scrape_live(max_pages=max_pages)
        logger.info("[LiveMatch] Scraped %d live jobs", len(raw_jobs))

        if not raw_jobs:
            return []

        # 3. Score each job with AI
        scored = self._score_jobs(profile, raw_jobs)

        # 4. Sort and return top results
        scored.sort(key=lambda x: x["score"], reverse=True)
        logger.info("[LiveMatch] Returning %d scored matches", len(scored))
        return scored

    # ── Step 2: Live scraping with detail page enrichment ────────────────────

    def _scrape_live(self, max_pages: int) -> list[dict]:
        """
        Scrape Rekrute + Emploi.ma + emploi-public.ma in real-time.

        For Rekrute: visits each individual job page to extract:
          - exact diploma requirement (Bac+3, Bac+5, Master…)
          - experience level (Junior 1-3 ans, Confirmé 3-7 ans…)
          - application deadline (exact date)
          - full job description (mission + profile)
        """
        jobs: list[dict] = []

        # ── Rekrute — with detail page enrichment ────────────────────────────
        try:
            from scraper.rekrute_scraper import RekruteScraper
            from scraper.utils import get_http_client

            class _QuickRekrute(RekruteScraper):
                MAX_PAGES = max_pages

            scraper  = _QuickRekrute(self.db)
            raw_list = scraper.fetch_jobs()

            with get_http_client("Rekrute-detail") as client:
                for raw in raw_list:
                    parsed = scraper.parse_job(raw)
                    if not parsed or not parsed.get("title") or not parsed.get("company"):
                        continue

                    cleaned = scraper.clean_data(parsed)
                    source_url = cleaned.get("source_url") or ""

                    # ── Visit detail page for rich data ───────────────────────
                    if source_url:
                        detail = scraper.fetch_detail_page(source_url, client)

                        # Override with richer data from detail page
                        if detail.get("required_diploma"):
                            cleaned["required_diploma"] = detail["required_diploma"]
                        if detail.get("required_experience"):
                            cleaned["required_experience"] = detail["required_experience"]
                        if detail.get("deadline"):
                            cleaned["deadline"] = detail["deadline"]
                        if detail.get("full_description") and len(detail["full_description"]) > len(cleaned.get("description", "")):
                            cleaned["description"] = detail["full_description"]
                        if detail.get("remote_work") is not None:
                            cleaned["remote_work"] = detail["remote_work"]
                        cleaned["soft_skills"] = detail.get("soft_skills", [])

                    jobs.append(cleaned)

            logger.info("[LiveMatch] Rekrute: %d jobs with detail enrichment", len(jobs))

        except Exception as exc:
            logger.warning("[LiveMatch] Rekrute scrape failed: %s", exc)

        # ── Emploi.ma ─────────────────────────────────────────────────────────
        try:
            from scraper.emploi_scraper import EmploiScraper
            scraper2 = EmploiScraper(self.db)
            raw2     = scraper2.fetch_jobs()
            before   = len(jobs)
            for raw in raw2:
                parsed = scraper2.parse_job(raw)
                if parsed and parsed.get("title") and parsed.get("company"):
                    cleaned = scraper2.clean_data(parsed)
                    jobs.append(cleaned)
            logger.info("[LiveMatch] Emploi.ma: %d jobs", len(jobs) - before)
        except Exception as exc:
            logger.warning("[LiveMatch] Emploi.ma scrape failed: %s", exc)

        # ── emploi-public.ma ──────────────────────────────────────────────────
        try:
            from scraper.emploi_public_scraper import EmploiPublicScraper
            scraper3 = EmploiPublicScraper(self.db)
            raw3     = scraper3.fetch_jobs()
            before   = len(jobs)
            for raw in raw3:
                parsed = scraper3.parse_job(raw)
                if parsed and parsed.get("title") and parsed.get("company"):
                    cleaned = scraper3.clean_data(parsed)
                    jobs.append(cleaned)
            logger.info("[LiveMatch] emploi-public.ma: %d jobs", len(jobs) - before)
        except Exception as exc:
            logger.warning("[LiveMatch] emploi-public.ma scrape failed: %s", exc)

        return jobs

    # ── Step 3: AI scoring ────────────────────────────────────────────────────

    def _score_jobs(self, profile: dict, jobs: list[dict]) -> list[dict]:
        """Try Groq batch scoring; fall back to local scoring."""
        try:
            return self._groq_score(profile, jobs)
        except Exception as exc:
            logger.info("[LiveMatch] Groq scoring unavailable (%s), using local scorer", exc)
            return self._local_score(profile, jobs)

    def _groq_score(self, profile: dict, jobs: list[dict]) -> list[dict]:
        """
        Use Groq llama3-8b-8192 to score each job against the user's full profile.
        Sends jobs in batches of 10 to stay within token limits.
        """
        from app.ai.llm_extractor import _get_groq_client
        client = _get_groq_client()
        if client is None:
            raise RuntimeError("No Groq client")

        profile_text = dedent(f"""
            Profil du candidat:
            - Diplôme: {profile['diploma']}
            - Domaine: {profile['domain']}
            - Expérience: {profile['years_experience']} ans
            - Compétences: {', '.join(profile['skills'][:15]) or 'non précisées'}
        """).strip()

        system = (
            "Tu es un expert en recrutement marocain. "
            "Pour chaque offre d'emploi, évalue la compatibilité avec le profil candidat. "
            "Retourne UNIQUEMENT un JSON array valide, sans texte autour."
        )

        all_results: list[dict] = []
        BATCH = 8

        for i in range(0, len(jobs), BATCH):
            batch = jobs[i:i + BATCH]

            jobs_text = ""
            for idx, job in enumerate(batch):
                desc = (job.get("description") or "")[:500]
                jobs_text += (
                    f"\n[{idx}] Titre: {job.get('title','')}\n"
                    f"    Entreprise: {job.get('company','')}\n"
                    f"    Contrat: {job.get('contract_type') or 'N/A'}\n"
                    f"    Description: {desc}\n"
                )

            prompt = dedent(f"""
                {profile_text}

                Offres d'emploi à évaluer:{jobs_text}

                Pour chaque offre [0] à [{len(batch)-1}], retourne:
                {{
                  "index": 0,
                  "score": 75,
                  "explanation": "Bonne correspondance car...",
                  "matching_skills": ["Python", "SQL"],
                  "missing_skills": ["Java"],
                  "required_diploma": "Master" ou null,
                  "required_experience": "3" ou null
                }}

                Retourne un JSON array avec {len(batch)} objets.
                score = 0 à 100 (0=aucun rapport, 100=correspondance parfaite).
                Considère: titre du poste, description, compétences requises, niveau d'études, domaine.
            """).strip()

            try:
                resp = client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user",   "content": prompt},
                    ],
                    temperature=0.0,
                    max_tokens=1500,
                    response_format={"type": "json_object"},
                )
                raw = resp.choices[0].message.content or "{}"
                parsed = json.loads(raw)

                # The model may return {"results": [...]} or just [...]
                if isinstance(parsed, dict):
                    batch_scores = parsed.get("results", parsed.get("offres", list(parsed.values())[0] if parsed else []))
                else:
                    batch_scores = parsed

                for item in batch_scores:
                    idx = item.get("index", 0)
                    if 0 <= idx < len(batch):
                        job = batch[idx]
                        score = min(100, max(0, int(item.get("score", 0))))
                        all_results.append({
                            **job,
                            "score":               score,
                            "explanation":         item.get("explanation", ""),
                            "matching_skills":     item.get("matching_skills", []),
                            "missing_skills":      item.get("missing_skills",  []),
                            "required_diploma":    item.get("required_diploma"),
                            "required_experience": item.get("required_experience"),
                        })

            except Exception as exc:
                logger.warning("[LiveMatch] Groq batch %d failed: %s", i // BATCH, exc)
                # Fall back to local scoring for this batch
                all_results.extend(self._local_score(profile, batch))

        logger.info("[LiveMatch] Groq scored %d jobs", len(all_results))
        return all_results

    def _local_score(self, profile: dict, jobs: list[dict]) -> list[dict]:
        """
        Fallback scorer using sentence-transformers + regex (no Groq needed).
        Matches on skills AND semantic similarity between profile and job text.
        """
        from app.ai.llm_extractor import extract_job_requirements
        from app.ai.cv_enricher   import extract_diploma, extract_experience
        from app.ai.embedder      import encode
        import numpy as np

        user_skills  = {s.lower() for s in profile["skills"]}
        user_domain  = profile["domain"]
        user_diploma = profile["diploma"]
        user_exp_str = profile["years_experience"]

        # Diploma seniority map — higher = more qualified
        DIPLOMA_RANK = {
            "Doctorat": 7,
            "Master": 6, "Ingénieur": 6, "Bac+5": 6,
            "Licence Pro": 5, "Licence": 5, "Bac+4": 5, "Bac+3": 5,
            "Bac+2": 4, "DUT": 4, "BTS": 4,
            "Bac": 3,
            "non précisé": 3,
        }

        def parse_years(s: str) -> float:
            try:    return float(str(s).replace("+", "").strip())
            except: return 0.0

        user_exp   = parse_years(user_exp_str)
        user_rank  = DIPLOMA_RANK.get(user_diploma, 3)

        # Encode user domain once
        if user_domain and user_domain != "non précisé":
            try:    user_domain_vec = encode([user_domain])[0]
            except: user_domain_vec = None
        else:
            user_domain_vec = None

        results: list[dict] = []
        for job in jobs:
            desc = (job.get("description") or "")
            title = (job.get("title") or "")

            # Extract job requirements from description
            req = extract_job_requirements(desc + " " + title)
            job_skills  = {s.lower() for s in req.required_skills}
            job_diploma = req.required_diploma
            job_exp_str = req.required_experience

            # ── Skill score ───────────────────────────────────────────────────
            if job_skills:
                matched = user_skills & job_skills
                skill_score = len(matched) / len(job_skills)
            else:
                # No required skills extracted → use semantic similarity on description
                skill_score = 0.4  # neutral

            # ── Title/domain score ────────────────────────────────────────────
            if user_domain_vec is not None:
                try:
                    title_vec   = encode([title])[0]
                    title_score = float(np.clip(user_domain_vec @ title_vec, 0, 1))
                except:
                    title_score = 0.4
            else:
                title_score = 0.4

            # ── Experience score ──────────────────────────────────────────────
            if job_exp_str and user_exp > 0:
                req_exp = parse_years(job_exp_str)
                exp_score = min(1.0, user_exp / req_exp) if req_exp > 0 else 0.5
            else:
                exp_score = 0.5

            # ── Diploma score ─────────────────────────────────────────────────
            if job_diploma:
                job_rank  = DIPLOMA_RANK.get(job_diploma, 3)
                dip_score = min(1.0, user_rank / job_rank) if job_rank > 0 else 0.5
            else:
                dip_score = 0.5

            # ── Final weighted score ──────────────────────────────────────────
            final = (
                skill_score * 0.45
                + title_score * 0.25
                + exp_score   * 0.15
                + dip_score   * 0.15
            )
            score = round(final * 100)

            matching = list(user_skills & job_skills)
            missing  = list(job_skills - user_skills)

            if skill_score >= 0.6:   expl = f"Bonne correspondance de compétences ({round(skill_score*100)}%)"
            elif title_score >= 0.6: expl = f"Domaine similaire au vôtre ({round(title_score*100)}%)"
            elif score >= 40:        expl = f"Correspondance partielle ({score}%)"
            else:                    expl = f"Faible correspondance ({score}%)"

            results.append({
                **job,
                "score":               score,
                "explanation":         expl,
                "matching_skills":     matching,
                "missing_skills":      missing,
                "required_diploma":    job_diploma,
                "required_experience": job_exp_str,
            })

        return results
