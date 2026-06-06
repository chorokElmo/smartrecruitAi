"""
LiveMatchService — Real-time job matching pipeline.

Flow (triggered each time the user clicks "Lancer la recherche"):
  1. Scrape listing pages from Rekrute, Emploi.ma, emploi-public.ma
  2. Pre-filter by title relevance (sentence-transformers cosine similarity)
     → rejects completely off-topic jobs before visiting detail pages
  3. Visit detail pages only for relevant candidates:
     exact diploma, experience level, deadline, full description
  4. Groq AI scores each job against the user's complete profile (0-100)
  5. Returns only jobs with score >= MIN_SCORE, sorted descending

This avoids showing "Infirmière" to a developer — the pre-filter cuts it.
"""
from __future__ import annotations

import json
import logging
import uuid
from textwrap import dedent
from typing import Optional

import numpy as np
from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.core.exceptions import BadRequestError, NotFoundError
from app.ai.embedder import encode

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────────
TITLE_PREFILTER_THRESHOLD = 0.15   # min cosine sim title vs user domain/skills
MIN_SCORE                 = 30     # don't return jobs below this score (0-100)
MAX_RESULTS               = 20     # max jobs returned


class LiveMatchService:
    def __init__(self, db: Session):
        self.db        = db
        self.user_repo = UserRepository(db)

    # ── Public entry point ────────────────────────────────────────────────────

    def search(self, user_id: str, max_pages: int = 3) -> list[dict]:
        """
        Scrape → pre-filter by title → enrich detail pages → Groq score → return.
        """
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
            "[LiveMatch] user=%s diploma=%s domain=%s skills=%d",
            user_id[:8], profile["diploma"], profile["domain"], len(profile["skills"])
        )

        # Step 1 — Scrape listing pages (cards only, fast)
        raw_jobs = self._scrape_listings(max_pages=max_pages)
        logger.info("[LiveMatch] Scraped %d listing cards", len(raw_jobs))
        if not raw_jobs:
            return []

        # Step 2 — Pre-filter by title relevance (no detail page yet)
        relevant = self._prefilter_by_title(profile, raw_jobs)
        logger.info(
            "[LiveMatch] Pre-filter: %d/%d jobs kept (threshold=%.2f)",
            len(relevant), len(raw_jobs), TITLE_PREFILTER_THRESHOLD
        )
        if not relevant:
            return []

        # Step 3 — Fetch detail pages only for relevant jobs
        enriched = self._enrich_with_detail(relevant)

        # Step 4 — AI scoring (Groq → fallback)
        scored = self._score_jobs(profile, enriched)

        # Step 5 — Filter, sort, cap
        results = [j for j in scored if j["score"] >= MIN_SCORE]
        results.sort(key=lambda x: x["score"], reverse=True)
        results = results[:MAX_RESULTS]

        logger.info("[LiveMatch] Returning %d results (score >= %d)", len(results), MIN_SCORE)
        return results

    # ── Step 1: Scrape listing cards ──────────────────────────────────────────

    def _scrape_listings(self, max_pages: int) -> list[dict]:
        """Scrape listing pages from all sources — card data only (fast)."""
        jobs: list[dict] = []

        # Rekrute
        try:
            from scraper.rekrute_scraper import RekruteScraper

            class _Quick(RekruteScraper):
                MAX_PAGES = max_pages

            scraper = _Quick(self.db)
            for raw in scraper.fetch_jobs():
                parsed = scraper.parse_job(raw)
                if parsed and parsed.get("title") and parsed.get("company"):
                    jobs.append(scraper.clean_data(parsed))
            logger.info("[LiveMatch] Rekrute listings: %d", len(jobs))
        except Exception as exc:
            logger.warning("[LiveMatch] Rekrute failed: %s", exc)

        # Emploi.ma
        before = len(jobs)
        try:
            from scraper.emploi_scraper import EmploiScraper
            s2 = EmploiScraper(self.db)
            for raw in s2.fetch_jobs():
                parsed = s2.parse_job(raw)
                if parsed and parsed.get("title") and parsed.get("company"):
                    jobs.append(s2.clean_data(parsed))
            logger.info("[LiveMatch] Emploi.ma: %d new", len(jobs) - before)
        except Exception as exc:
            logger.warning("[LiveMatch] Emploi.ma failed: %s", exc)

        # emploi-public.ma
        before = len(jobs)
        try:
            from scraper.emploi_public_scraper import EmploiPublicScraper
            s3 = EmploiPublicScraper(self.db)
            for raw in s3.fetch_jobs():
                parsed = s3.parse_job(raw)
                if parsed and parsed.get("title") and parsed.get("company"):
                    jobs.append(s3.clean_data(parsed))
            logger.info("[LiveMatch] emploi-public.ma: %d new", len(jobs) - before)
        except Exception as exc:
            logger.warning("[LiveMatch] emploi-public.ma failed: %s", exc)

        return jobs

    # ── Step 2: Pre-filter by title relevance ─────────────────────────────────

    def _prefilter_by_title(self, profile: dict, jobs: list[dict]) -> list[dict]:
        """
        Fast semantic filter: compare each job title against the user's
        domain + top skills using cosine similarity.

        Only jobs whose title is semantically close to the user's profile
        proceed to the (slow) detail page fetch + Groq scoring.

        Examples for a Python developer:
          "Développeur Python Senior"  → sim ≈ 0.82  → KEEP
          "Data Engineer AWS"          → sim ≈ 0.65  → KEEP
          "Infirmière de travail"      → sim ≈ 0.08  → DROP
          "Juriste (H/F)"              → sim ≈ 0.06  → DROP
          "Key Account Manager"        → sim ≈ 0.21  → DROP
        """
        if not jobs:
            return []

        # Build user context string to encode once
        skills_str = ", ".join(profile["skills"][:10])
        user_text  = f"{profile['domain']} {skills_str}".strip()
        if not user_text or user_text == "non précisé":
            # No profile → keep all (can't filter)
            return jobs

        try:
            titles     = [j.get("title", "") for j in jobs]
            all_texts  = [user_text] + titles
            embeddings = encode(all_texts)          # (1+N, 384) L2-normalised

            user_vec   = embeddings[0]              # (384,)
            title_vecs = embeddings[1:]             # (N, 384)

            # Cosine similarity: dot product of L2-normalised vectors
            sims = title_vecs @ user_vec            # (N,)

            kept = [
                jobs[i] for i, sim in enumerate(sims)
                if float(sim) >= TITLE_PREFILTER_THRESHOLD
            ]

            # Log what was dropped
            dropped = [
                f"{jobs[i]['title'][:40]} ({float(sims[i]):.2f})"
                for i, sim in enumerate(sims)
                if float(sim) < TITLE_PREFILTER_THRESHOLD
            ]
            if dropped:
                logger.debug("[LiveMatch] Dropped: %s", " | ".join(dropped[:8]))

            return kept

        except Exception as exc:
            logger.warning("[LiveMatch] Title pre-filter failed: %s", exc)
            return jobs  # fallback: keep all

    # ── Step 3: Enrich with detail page data ──────────────────────────────────

    def _enrich_with_detail(self, jobs: list[dict]) -> list[dict]:
        """Visit each job's detail page to get diploma, experience, deadline."""
        enriched = []
        try:
            from scraper.rekrute_scraper import RekruteScraper
            from scraper.utils import get_http_client

            scraper = RekruteScraper(self.db)
            with get_http_client("Rekrute-detail") as client:
                for job in jobs:
                    url = job.get("source_url", "")
                    # Only fetch detail for Rekrute URLs
                    if url and "rekrute.com" in url:
                        detail = scraper.fetch_detail_page(url, client)
                        if detail.get("required_diploma"):
                            job["required_diploma"]    = detail["required_diploma"]
                        if detail.get("required_experience"):
                            job["required_experience"] = detail["required_experience"]
                        if detail.get("deadline"):
                            job["deadline"]            = detail["deadline"]
                        if detail.get("full_description") and len(detail["full_description"]) > len(job.get("description", "")):
                            job["description"]         = detail["full_description"]
                        if detail.get("remote_work") is not None:
                            job["remote_work"]         = detail["remote_work"]
                    enriched.append(job)
        except Exception as exc:
            logger.warning("[LiveMatch] Detail enrichment failed: %s", exc)
            enriched = jobs

        return enriched

    # ── Step 4: AI scoring ────────────────────────────────────────────────────

    def _score_jobs(self, profile: dict, jobs: list[dict]) -> list[dict]:
        """Try Groq; fall back to local scorer."""
        try:
            return self._groq_score(profile, jobs)
        except Exception as exc:
            logger.info("[LiveMatch] Groq unavailable (%s), using local scorer", exc)
            return self._local_score(profile, jobs)

    def _groq_score(self, profile: dict, jobs: list[dict]) -> list[dict]:
        """
        Groq llama3-8b-8192: score each job 0-100 against the user's full profile.

        Strict rubric:
          90-100: Parfait — domaine identique, diplôme OK, exp OK, compétences présentes
          70-89 : Très bon — domaine proche, 1-2 compétences manquantes
          50-69 : Bon — même secteur large, manque quelques éléments
          30-49 : Partiel — lien indirect, compétences transférables
          0-29  : Hors profil — domaine totalement différent
        """
        from app.ai.llm_extractor import _get_groq_client
        client = _get_groq_client()
        if client is None:
            raise RuntimeError("No Groq client")

        profile_block = dedent(f"""
            PROFIL CANDIDAT:
            - Diplôme obtenu: {profile['diploma']}
            - Domaine: {profile['domain']}
            - Expérience: {profile['years_experience']} ans
            - Compétences: {', '.join(profile['skills'][:15]) or 'non précisées'}
        """).strip()

        system = (
            "Tu es un recruteur expert en matching CV/offre pour le marché marocain. "
            "Sois STRICT et PRÉCIS. Un développeur Python ne correspond PAS à un poste "
            "de comptable, juriste ou infirmier — score = 0-15 dans ce cas. "
            "Retourne UNIQUEMENT un JSON array valide."
        )

        all_results: list[dict] = []
        BATCH = 6

        for i in range(0, len(jobs), BATCH):
            batch = jobs[i:i + BATCH]
            jobs_block = ""
            for idx, job in enumerate(batch):
                req_dip = job.get("required_diploma") or "non précisé"
                req_exp = job.get("required_experience") or "non précisé"
                desc    = (job.get("description") or "")[:600]
                jobs_block += (
                    f"\n[{idx}] Titre: {job.get('title', '')}\n"
                    f"     Diplôme requis: {req_dip}\n"
                    f"     Expérience requise: {req_exp}\n"
                    f"     Description: {desc}\n"
                )

            prompt = dedent(f"""
                {profile_block}

                OFFRES À ÉVALUER:{jobs_block}

                BARÈME STRICT:
                - 80-100: Domaine identique + diplôme OK + compétences présentes
                - 60-79 : Même secteur + majorité des compétences présentes
                - 40-59 : Lien partiel — compétences transférables
                - 20-39 : Peu de rapport — quelques points communs
                - 0-19  : Hors profil total (ex: dev vs juriste/infirmier)

                Pour chaque offre [0] à [{len(batch)-1}]:
                {{
                  "index": 0,
                  "score": 75,
                  "explanation": "Correspond car... / Ne correspond pas car...",
                  "matching_skills": ["Python", "SQL"],
                  "missing_skills": ["Java"],
                  "required_diploma": "Bac+5" ou null,
                  "required_experience": "Junior 1-3 ans" ou null
                }}

                Retourne un JSON array de {len(batch)} objets. Sois strict sur le score.
            """).strip()

            try:
                resp = client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user",   "content": prompt},
                    ],
                    temperature=0.0,
                    max_tokens=1200,
                    response_format={"type": "json_object"},
                )
                raw    = resp.choices[0].message.content or "{}"
                parsed = json.loads(raw)

                # Handle {"results": [...]} or direct [...]
                if isinstance(parsed, dict):
                    batch_scores = next(
                        (v for v in parsed.values() if isinstance(v, list)),
                        []
                    )
                else:
                    batch_scores = parsed

                for item in batch_scores:
                    idx = item.get("index", 0)
                    if 0 <= idx < len(batch):
                        job   = batch[idx]
                        score = min(100, max(0, int(item.get("score", 0))))
                        all_results.append({
                            **job,
                            "score":               score,
                            "explanation":         item.get("explanation", ""),
                            "matching_skills":     item.get("matching_skills", []),
                            "missing_skills":      item.get("missing_skills",  []),
                            "required_diploma":    item.get("required_diploma")    or job.get("required_diploma"),
                            "required_experience": item.get("required_experience") or job.get("required_experience"),
                        })

            except Exception as exc:
                logger.warning("[LiveMatch] Groq batch failed: %s", exc)
                all_results.extend(self._local_score(profile, batch))

        return all_results

    def _local_score(self, profile: dict, jobs: list[dict]) -> list[dict]:
        """Fallback: sentence-transformer + regex scoring."""
        from app.ai.llm_extractor import extract_job_requirements
        from app.ai.cv_enricher   import extract_diploma

        DIPLOMA_RANK = {
            "Doctorat": 7, "Master": 6, "Ingénieur": 6, "Bac+5": 6,
            "Licence": 5, "Licence Pro": 5, "Bac+4": 5, "Bac+3": 5,
            "BTS": 4, "DUT": 4, "Bac+2": 4, "Bac": 3, "non précisé": 3,
        }

        user_skills  = {s.lower() for s in profile["skills"]}
        user_rank    = DIPLOMA_RANK.get(profile["diploma"], 3)

        # Encode user domain once
        user_domain  = profile["domain"]
        try:
            user_vec = encode([user_domain])[0] if user_domain != "non précisé" else None
        except Exception:
            user_vec = None

        def parse_yrs(s):
            try: return float(str(s or "0").replace("+", "").split("-")[0].strip())
            except: return 0.0

        results = []
        for job in jobs:
            desc      = (job.get("description") or "")
            title     = (job.get("title") or "")
            req       = extract_job_requirements(desc + " " + title)
            job_skills = {s.lower() for s in req.required_skills}
            job_dip    = job.get("required_diploma") or req.required_diploma
            job_exp    = job.get("required_experience") or req.required_experience

            # Skill score
            if job_skills:
                matched      = user_skills & job_skills
                skill_score  = len(matched) / len(job_skills)
            else:
                skill_score  = 0.3

            # Title/domain score
            if user_vec is not None:
                try:
                    tvec        = encode([title])[0]
                    title_score = float(np.clip(user_vec @ tvec, 0, 1))
                except Exception:
                    title_score = 0.3
            else:
                title_score = 0.3

            # Diploma score
            job_rank   = DIPLOMA_RANK.get(job_dip or "non précisé", 3)
            dip_score  = min(1.0, user_rank / job_rank) if job_rank > 0 else 0.5

            # Experience score
            user_exp = parse_yrs(profile["years_experience"])
            req_exp  = parse_yrs(job_exp)
            if req_exp > 0 and user_exp > 0:
                exp_score = min(1.0, user_exp / req_exp)
            else:
                exp_score = 0.5

            final = round(
                skill_score * 0.40
                + title_score * 0.30
                + dip_score   * 0.15
                + exp_score   * 0.15
            ) * 100

            matched_list = list(user_skills & job_skills)
            missing_list = list(job_skills - user_skills)

            if final >= 70:   expl = f"Très bon profil — {round(skill_score*100)}% compétences correspondantes"
            elif final >= 50: expl = f"Bonne correspondance — domaine similaire ({round(title_score*100)}%)"
            elif final >= 30: expl = f"Correspondance partielle — quelques points communs"
            else:             expl = f"Correspondance faible — domaine différent du vôtre"

            results.append({
                **job,
                "score":               int(final),
                "explanation":         expl,
                "matching_skills":     matched_list,
                "missing_skills":      missing_list,
                "required_diploma":    job_dip,
                "required_experience": job_exp,
            })

        return results
