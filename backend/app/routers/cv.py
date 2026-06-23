from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cv import CVResponse
from app.services.cv_service import CVService
from app.core.dependencies import get_current_user_id

router = APIRouter()

# Allowed MIME types for CV uploads
_ALLOWED_CONTENT_TYPES = {"application/pdf", "application/octet-stream"}


@router.post("/upload", response_model=CVResponse, status_code=201)
async def upload_cv(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Upload a PDF CV.
    - Rejects non-PDF files immediately (400) before touching the service
    - Saves the file
    - Extracts text with PyMuPDF
    - Detects skills from taxonomy
    - Syncs skills to user profile
    """
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    return await CVService(db).upload_and_process(user_id, file)


@router.post("/upload-image", response_model=CVResponse, status_code=201)
async def upload_cv_image(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Upload a CV as an image (PNG, JPG, JPEG, WEBP).
    Uses pytesseract OCR to extract text, then runs the same skill-extraction
    pipeline as the PDF upload endpoint.
    """
    from app.utils.file_handler import save_upload
    from app.repositories.cv_repository import CVRepository
    from app.repositories.user_repository import UserRepository
    from app.ai.llm_extractor import extract_cv_data
    from app.core.exceptions import NotFoundError
    import uuid as _uuid

    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp", "image/tiff"}
    ct = (file.content_type or "").lower()
    if ct not in allowed and not (file.filename or "").lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")):
        raise HTTPException(status_code=400, detail="Only image files are accepted (PNG, JPG, WEBP)")

    # Save the image file
    file_path = await save_upload(file, subfolder="cvs")

    cv_repo   = CVRepository(db)
    user_repo = UserRepository(db)

    # Create CV record
    cv = cv_repo.create(
        user_id=_uuid.UUID(user_id),
        file_path=file_path,
        original_name=file.filename or "cv-image.png",
    )

    # OCR the image
    try:
        text = extract_text_from_image(file_path)
    except ValueError:
        text = ""

    # Extract structured data
    extraction = extract_cv_data(text) if text else None
    skills           = extraction.skills           if extraction else []
    diploma          = extraction.diploma          if extraction else None
    domain           = extraction.domain           if extraction else None
    years_experience = extraction.years_experience if extraction else None

    # Persist
    cv = cv_repo.update_extracted(cv, text=text, skills=skills, diploma=diploma,
                                  domain=domain, years_experience=years_experience)

    # Sync to user profile
    user = user_repo.get_by_id(_uuid.UUID(user_id))
    if user:
        merged_skills = list({*user.skills, *skills})
        updates: dict = {"skills": merged_skills}
        if diploma          and not user.diploma:          updates["diploma"]          = diploma
        if domain           and not user.domain:           updates["domain"]           = domain
        if years_experience and not user.years_experience: updates["years_experience"] = years_experience
        user_repo.update(user, updates)

    return CVResponse.model_validate(cv)


@router.post("/debug")
async def debug_cv(file: UploadFile = File(...)):
    """Dev-only: inspect exactly where CV extraction fails."""
    import os, re, tempfile
    from app.ai.cv_extractor import extract_text_from_pdf, extract_text_from_image
    from app.ai.llm_extractor import extract_with_llm, extract_name_with_groq
    from app.ai.skill_extractor import extract_skills, find_email, find_name_fallback

    content = await file.read()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(content); tmp.close()
    try:
        try:
            text = extract_text_from_pdf(tmp.name)
        except Exception as e:
            text = f"__EXTRACTION_ERROR__ {e}"
        ok = text and not text.startswith("__")
        llm   = extract_with_llm(text) if ok else None
        regex = extract_skills(text) if ok else []
        final = (llm or {}).get("skills") or regex
        lines = [l.strip() for l in text.split("\n") if l.strip()] if ok else []
        emails = re.findall(r"[\w\.-]+@[\w\.-]+\.\w+", text) if ok else []
        return {
            "raw_text_length":      len(text),
            "raw_text_preview":     text[:500],
            "first_20_lines":       lines[:20],
            "emails_found_by_regex": emails,
            "name_from_groq":       extract_name_with_groq(text) if ok else "",
            "name_from_fallback":   find_name_fallback(text) if ok else None,
            "email_final":          find_email(text) if ok else None,
            "llm_result":           llm,
            "regex_result":         regex,
            "final_skills":         final,
        }
    finally:
        os.unlink(tmp.name)


@router.post("/generate")
def generate_cv(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Generate a professional French CV from the user's profile.
    Groq (llama-3.1-8b-instant) → Markdown → reportlab PDF.
    NOTE: spec named llama3-8b-8192 but that model is decommissioned on Groq —
    using the supported llama-3.1-8b-instant instead.
    """
    import io, uuid
    from fastapi.responses import StreamingResponse
    from app.repositories.user_repository import UserRepository

    user = UserRepository(db).get_by_id(uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    name   = f"{user.first_name} {user.last_name}".strip() or "Candidat"
    skills = ", ".join(user.skills[:20]) if user.skills else "—"
    prompt = (
        "Generate a professional CV in French for:\n"
        f"Name: {name}, Domain: {user.domain or 'Développement logiciel'}, "
        f"Diploma: {user.diploma or 'Non précisé'},\n"
        f"Experience: {user.years_experience or '0'} years, Skills: {skills}\n"
        "Return clean professional CV in Markdown with sections:\n"
        "Profil, Compétences, Formation, Expérience, Langues.\n"
        "Make it ATS-friendly for Moroccan job market."
    )

    # ── Groq call (mandatory; 500 on failure) ────────────────
    try:
        from app.ai.llm_extractor import _get_groq_client
        client = _get_groq_client()
        if client is None:
            raise RuntimeError("Groq API key not configured (GROQ_API_KEY)")
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=1200, timeout=30,
        )
        markdown = (resp.choices[0].message.content or "").strip()
        if len(markdown) < 50:
            raise RuntimeError("Groq returned an empty CV")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"CV generation failed: {exc}")

    pdf = _markdown_to_pdf(markdown, name)
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cv-smartrecruit.pdf"'},
    )


def _markdown_to_pdf(markdown: str, name: str) -> bytes:
    """Render simple Markdown (headings, bullets, paragraphs) to a PDF via reportlab."""
    import io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], textColor=HexColor("#6B4EFF"), fontSize=20)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=HexColor("#6B4EFF"), fontSize=13)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10.5, leading=15)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm,
                            leftMargin=18 * mm, rightMargin=18 * mm, title=f"CV - {name}")
    flow, bullets = [], []

    def flush_bullets():
        if bullets:
            flow.append(ListFlowable([ListItem(Paragraph(b, body)) for b in bullets],
                                     bulletType="bullet", leftIndent=12))
            bullets.clear()

    for raw in markdown.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush_bullets(); flow.append(Spacer(1, 4)); continue
        if line.startswith("### "):
            flush_bullets(); flow.append(Paragraph(line[4:], h2))
        elif line.startswith("## "):
            flush_bullets(); flow.append(Paragraph(line[3:], h2))
        elif line.startswith("# "):
            flush_bullets(); flow.append(Paragraph(line[2:], h1))
        elif line.lstrip().startswith(("- ", "* ")):
            bullets.append(line.lstrip()[2:])
        else:
            flush_bullets()
            flow.append(Paragraph(line.replace("**", ""), body))
    flush_bullets()

    doc.build(flow)
    return buf.getvalue()


@router.get("/latest", response_model=CVResponse)
def get_latest_cv(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get the most recently uploaded CV for the current user."""
    return CVService(db).get_latest(user_id)
