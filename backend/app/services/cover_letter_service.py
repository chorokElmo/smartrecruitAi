"""
CoverLetterService — generate a personalised cover letter via Groq LLM.

Strategy:
  1. Load candidate profile + target job from DB.
  2. Try Groq llama-3.1-8b-instant to compose a professional French letter.
  3. Fall back to a high-quality structured template if the API key is
     absent, the API is down, or any other error occurs.

Never raises — always returns a non-empty string.
"""

from __future__ import annotations

import logging
import uuid
from textwrap import dedent

from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class CoverLetterService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)
        self.job_repo  = JobRepository(db)

    def generate(self, user_id: str, job_id: str) -> str:
        """
        Return a personalised cover letter as plain text.
        Tries Groq first, falls back to a template.
        """
        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("User")

        job = self.job_repo.get_by_id(uuid.UUID(job_id))
        if not job:
            raise NotFoundError("Job")

        # Build a context dict for both LLM and template
        ctx = {
            "full_name":        f"{user.first_name} {user.last_name}",
            "email":            user.email,
            "diploma":          user.diploma          or "formation en informatique",
            "domain":           user.domain           or "développement logiciel",
            "years_experience": user.years_experience or "plusieurs",
            "skills":           ", ".join(user.skills[:10]) if user.skills else "Python, SQL",
            "job_title":        job.title,
            "company":          job.company,
            "location":         job.location          or "Maroc",
            "job_description":  (job.description or "")[:1500],
        }

        # ── Try LLM ──────────────────────────────────────────────
        letter = self._llm_generate(ctx)
        if letter:
            return letter

        # ── Template fallback ─────────────────────────────────────
        return self._template_generate(ctx)

    # ─────────────────────────────────────────────────────────────

    def _llm_generate(self, ctx: dict) -> str:
        """Call Groq; return empty string on any failure."""
        from app.ai.llm_extractor import _get_groq_client
        client = _get_groq_client()
        if client is None:
            return ""

        system = (
            "Tu es un expert en rédaction de lettres de motivation professionnelles en français "
            "pour le marché marocain. Rédige une lettre complète, professionnelle et personnalisée."
        )

        prompt = dedent(f"""
            Rédige une lettre de motivation professionnelle en français pour :

            CANDIDAT :
            - Nom : {ctx['full_name']}
            - Email : {ctx['email']}
            - Diplôme : {ctx['diploma']}
            - Domaine : {ctx['domain']}
            - Expérience : {ctx['years_experience']} ans
            - Compétences : {ctx['skills']}

            POSTE VISÉ :
            - Titre : {ctx['job_title']}
            - Entreprise : {ctx['company']}
            - Lieu : {ctx['location']}
            - Description : {ctx['job_description']}

            La lettre doit :
            1. Commencer par "Madame, Monsieur,"
            2. Avoir 3 paragraphes : accroche, compétences adaptées au poste, motivation
            3. Finir par "Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
            4. Signer avec le nom complet
            5. Faire environ 300 mots

            Retourne UNIQUEMENT la lettre, sans explication ni commentaire.
        """).strip()

        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.7,
                max_tokens=800,
            )
            letter = (response.choices[0].message.content or "").strip()
            if len(letter) > 100:
                logger.info("[CoverLetter] LLM generated %d chars for user %s", len(letter), str(ctx['email'])[:20])
                return letter
        except Exception as exc:
            logger.warning("[CoverLetter] LLM failed: %s", exc)

        return ""

    def _template_generate(self, ctx: dict) -> str:
        """High-quality structured template fallback."""
        skills_display = ctx["skills"]
        exp_text = (
            f"{ctx['years_experience']} ans d'expérience"
            if ctx["years_experience"] not in ("plusieurs", "")
            else "une expérience solide"
        )

        return dedent(f"""
            {ctx['full_name']}
            {ctx['email']}

            Madame, Monsieur,

            Titulaire d'un {ctx['diploma']} en {ctx['domain']}, avec {exp_text} dans le secteur,
            je me permets de vous adresser ma candidature pour le poste de {ctx['job_title']}
            au sein de {ctx['company']}.

            Au cours de mon parcours, j'ai développé de solides compétences techniques, notamment
            en {skills_display}. Ces expertises m'ont permis de contribuer efficacement à des
            projets concrets et de m'adapter rapidement aux exigences de différents environnements
            professionnels. La nature du poste proposé chez {ctx['company']} correspond parfaitement
            à mon profil et à mes ambitions professionnelles.

            Je suis particulièrement motivé(e) par les valeurs et les projets de {ctx['company']},
            et je suis convaincu(e) que mon expérience et mes compétences me permettront d'apporter
            une réelle valeur ajoutée à votre équipe. Je serais ravi(e) de vous présenter mon
            parcours lors d'un entretien.

            Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

            {ctx['full_name']}
        """).strip()
