from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cv import CVResponse
from app.services.cv_service import CVService
from app.core.dependencies import get_current_user_id

router = APIRouter()

# Allowed MIME types for CV uploads
_ALLOWED_CONTENT_TYPES = {"application/pdf"}


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only PDF files are accepted. "
                f"Received content type: '{file.content_type}'. "
                "Please upload a file with content type 'application/pdf'."
            ),
        )

    return await CVService(db).upload_and_process(user_id, file)


@router.post("/debug")
async def debug_cv(file: UploadFile = File(...)):
    """Dev-only: inspect exactly where CV extraction fails."""
    import os, re, tempfile
    from app.ai.cv_extractor import extract_text_from_pdf
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
    """Generate a professional French CV (Claude → PDF) from the user's profile."""
    from fastapi.responses import StreamingResponse
    from app.services.cv_generator_service import CvGeneratorService
    import io
    pdf = CvGeneratorService(db).generate_pdf(user_id)
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="cv-smartrecruit.pdf"'},
    )


@router.get("/latest", response_model=CVResponse)
def get_latest_cv(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get the most recently uploaded CV for the current user."""
    return CVService(db).get_latest(user_id)
