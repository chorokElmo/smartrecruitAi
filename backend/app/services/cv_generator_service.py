"""
CvGeneratorService — generate a professional French CV with Claude, render to PDF.

Flow:
  1. Build the prompt from the user profile.
  2. Call Claude claude-3-haiku-20240307 → Markdown CV (fallback template if no key).
  3. markdown2 → HTML → xhtml2pdf → PDF bytes.

Never raises for the LLM step — always returns a CV (template fallback).
"""
from __future__ import annotations

import io
import logging
import uuid
from textwrap import dedent

from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.user_repository import UserRepository
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class CvGeneratorService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    def _profile(self, user_id: str) -> dict:
        user = self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise NotFoundError("User")
        return {
            "name":             f"{user.first_name} {user.last_name}".strip() or "Candidat",
            "email":            user.email,
            "skills":           ", ".join(user.skills[:20]) if user.skills else "—",
            "diploma":          user.diploma or "Non précisé",
            "domain":           user.domain or "Développement logiciel",
            "years_experience": user.years_experience or "0",
        }

    def generate_markdown(self, user_id: str) -> str:
        p = self._profile(user_id)
        prompt = dedent(f"""
            Generate a professional CV in French for:
            Name: {p['name']}
            Email: {p['email']}
            Domain: {p['domain']}
            Diploma: {p['diploma']}
            Experience: {p['years_experience']} years
            Skills: {p['skills']}

            Return a clean, professional CV in Markdown format with sections:
            Profil, Compétences, Formation, Expérience, Langues.
            Make it ATS-friendly and tailored for Moroccan job market.
            Return ONLY the markdown, no commentary.
        """).strip()

        if settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                resp = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=1500,
                    messages=[{"role": "user", "content": prompt}],
                )
                md = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
                if len(md) > 100:
                    logger.info("[CVGen] Claude generated CV (%d chars)", len(md))
                    return md
            except Exception as exc:
                logger.warning("[CVGen] Claude failed, using template: %s", exc)

        return self._template(p)

    def _template(self, p: dict) -> str:
        return dedent(f"""
            # {p['name']}
            {p['email']}

            ## Profil
            Professionnel en {p['domain']} avec {p['years_experience']} an(s) d'expérience,
            titulaire d'un diplôme {p['diploma']}. Motivé(e) et orienté(e) résultats,
            à la recherche de nouvelles opportunités sur le marché marocain.

            ## Compétences
            {p['skills']}

            ## Formation
            - {p['diploma']}

            ## Expérience
            - {p['years_experience']} an(s) d'expérience en {p['domain']}

            ## Langues
            - Arabe : langue maternelle
            - Français : courant
            - Anglais : professionnel
        """).strip()

    def generate_pdf(self, user_id: str) -> bytes:
        md = self.generate_markdown(user_id)
        import markdown2
        from xhtml2pdf import pisa

        html_body = markdown2.markdown(md)
        html = f"""
        <html><head><meta charset="utf-8"><style>
          body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11pt; color: #1A1A2E; }}
          h1 {{ color: #6B4EFF; font-size: 22pt; margin-bottom: 2px; }}
          h2 {{ color: #6B4EFF; font-size: 13pt; border-bottom: 1px solid #6B4EFF;
                padding-bottom: 3px; margin-top: 16px; }}
          ul {{ margin: 4px 0; }} li {{ margin: 2px 0; }}
        </style></head><body>{html_body}</body></html>
        """
        buf = io.BytesIO()
        pisa.CreatePDF(html, dest=buf)
        return buf.getvalue()
