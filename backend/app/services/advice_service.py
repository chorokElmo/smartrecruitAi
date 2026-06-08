"""
AdviceService — generate and cache a personalised career roadmap.

Strategy:
  1. Check DB for a cached roadmap generated < 24h ago. Return it if fresh.
  2. Otherwise call Groq (llama-3.1-8b-instant) with user profile + top missing skills.
  3. Fall back to a structured template if the key is absent or the API fails.
  4. Persist the result in the `roadmaps` table (upsert by user_id).

Cache TTL: 24 hours — prevents hammering the free Groq tier.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from textwrap import dedent

from sqlalchemy.orm import Session

from app.models.roadmap import Roadmap
from app.repositories.user_repository import UserRepository
from app.repositories.recommendation_repository import RecommendationRepository
from app.core.exceptions import NotFoundError, BadRequestError

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 24


class AdviceService:
    def __init__(self, db: Session):
        self.db       = db
        self.user_repo = UserRepository(db)
        self.rec_repo  = RecommendationRepository(db)

    def get_or_generate(self, user_id: str, force: bool = False) -> dict:
        """
        Return the cached roadmap or generate a fresh one.

        Returns:
            {
              "content":      str   — the full roadmap text
              "generated_at": str   — ISO timestamp
              "cached":       bool  — True if served from cache
            }
        """
        uid = uuid.UUID(user_id)

        # ── Check cache ────────────────────────────────────────
        existing = self.db.query(Roadmap).filter(Roadmap.user_id == uid).first()
        if not force and existing:
            age = datetime.now(timezone.utc) - existing.generated_at.replace(tzinfo=timezone.utc)
            if age < timedelta(hours=CACHE_TTL_HOURS):
                logger.info("[Advice] Serving cached roadmap (age=%dh) for user %s", int(age.total_seconds()/3600), user_id[:8])
                return {
                    "content":      existing.content,
                    "generated_at": existing.generated_at.isoformat(),
                    "cached":       True,
                }

        # ── Build context ─────────────────────────────────────
        user = self.user_repo.get_by_id(uid)
        if not user:
            raise NotFoundError("User")
        if not user.skills:
            raise BadRequestError("Add skills to your profile before generating a roadmap.")

        # Gather top missing skills from recommendations
        recs       = self.rec_repo.get_by_user(uid, limit=10)
        missing    = []
        seen       = set()
        for r in recs:
            for s in (r.missing_skills or []):
                if s.lower() not in seen:
                    missing.append(s)
                    seen.add(s.lower())
        missing = missing[:8]

        ctx = {
            "full_name":     f"{user.first_name} {user.last_name}",
            "diploma":       user.diploma          or "non précisé",
            "domain":        user.domain           or "développement logiciel",
            "years_exp":     user.years_experience or "non précisé",
            "skills":        ", ".join(user.skills[:12]),
            "missing":       ", ".join(missing) if missing else "aucune lacune identifiée",
        }

        # ── Try LLM ──────────────────────────────────────────
        content = self._llm_generate(ctx)
        if not content:
            content = self._template_generate(ctx)

        # ── Persist (upsert) ───────────────────────────────────
        now = datetime.now(timezone.utc)
        if existing:
            existing.content      = content
            existing.generated_at = now
            self.db.commit()
            self.db.refresh(existing)
        else:
            roadmap = Roadmap(user_id=uid, content=content)
            self.db.add(roadmap)
            self.db.commit()

        return {
            "content":      content,
            "generated_at": now.isoformat(),
            "cached":       False,
        }

    # ─────────────────────────────────────────────────────────

    def _llm_generate(self, ctx: dict) -> str:
        from app.ai.llm_extractor import _get_groq_client
        client = _get_groq_client()
        if client is None:
            return ""

        prompt = dedent(f"""
            Tu es un conseiller carrière expert pour le marché marocain du travail.

            PROFIL DU CANDIDAT :
            - Nom : {ctx['full_name']}
            - Diplôme : {ctx['diploma']}
            - Domaine : {ctx['domain']}
            - Expérience : {ctx['years_exp']} ans
            - Compétences actuelles : {ctx['skills']}
            - Compétences manquantes (selon les offres d'emploi) : {ctx['missing']}

            Génère un roadmap de développement professionnel structuré avec :
            1. 🎯 Objectif professionnel (1 phrase)
            2. 📚 3-4 compétences prioritaires à acquérir (avec ressources gratuites)
            3. 🚀 3 étapes concrètes pour les 6 prochains mois
            4. 💡 1 conseil personnalisé pour le marché marocain

            Format : texte clair avec emojis, pas de markdown complexe. Maximum 400 mots.
        """).strip()

        try:
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "Tu es un conseiller carrière expert pour le Maroc. Réponds en français."},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.7,
                max_tokens=700,
            )
            content = (resp.choices[0].message.content or "").strip()
            if len(content) > 100:
                logger.info("[Advice] LLM roadmap generated (%d chars)", len(content))
                return content
        except Exception as exc:
            logger.warning("[Advice] LLM failed: %s", exc)

        return ""

    def _template_generate(self, ctx: dict) -> str:
        missing_text = (
            f"Concentrez-vous sur : {ctx['missing']}"
            if ctx["missing"] != "aucune lacune identifiée"
            else "Votre profil est bien équilibré. Approfondissez vos compétences actuelles."
        )

        return dedent(f"""
            🎯 Objectif professionnel
            Évoluer en tant que professionnel senior en {ctx['domain']} grâce à un développement continu de vos compétences techniques et relationnelles.

            📚 Compétences prioritaires à développer
            {missing_text}

            Ressources gratuites recommandées :
            • freeCodeCamp.org — développement web et algorithmes
            • Coursera (audit gratuit) — certifications Google, IBM, Meta
            • YouTube (Traversy Media, Fireship) — tutoriels pratiques
            • GitHub — contribuez à des projets open source

            🚀 Plan sur 6 mois

            Mois 1-2 : Maîtriser une compétence manquante prioritaire via un projet personnel.
            Mois 3-4 : Réaliser un projet concret (portfolio ou contribution open source).
            Mois 5-6 : Préparer votre profil LinkedIn, compléter votre CV et postuler activement.

            💡 Conseil pour le marché marocain
            Le marché marocain valorise les profils polyvalents. Combinez vos compétences techniques ({ctx['skills'].split(',')[0].strip()}) avec des soft skills comme la communication et la gestion de projet. Les offres en CDI sont fréquentes dans les ESN (Capgemini, CGI, Atos) basées à Casablanca et Rabat.

            — Roadmap généré par SmartRecruit AI pour {ctx['full_name']}
        """).strip()
