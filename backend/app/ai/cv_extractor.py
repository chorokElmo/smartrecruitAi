"""Extract raw text from a PDF file using PyMuPDF (fitz), with OCR fallback."""
import logging
import re
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


def _clean(text: str) -> str:
    text = text.encode("utf-8", "ignore").decode("utf-8", "ignore")
    text = "".join(ch for ch in text if ch == "\n" or ch == "\t" or (32 <= ord(ch) <= 0x10FFFF and ch.isprintable()))
    return text.strip()


def _ocr_pdf(file_path: str) -> str:
    """OCR fallback for scanned/image PDFs. Renders pages with PyMuPDF (no Poppler)."""
    try:
        import io
        import pytesseract
        from PIL import Image

        import os
        for cand in (
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ):
            if os.path.exists(cand):
                pytesseract.pytesseract.tesseract_cmd = cand
                break

        doc = fitz.open(file_path)
        parts = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            try:
                parts.append(pytesseract.image_to_string(img, lang="fra+eng"))
            except Exception:
                parts.append(pytesseract.image_to_string(img))
        doc.close()
        logger.info("[CV] OCR fallback used (%d pages)", len(parts))
        return _clean("\n".join(parts))
    except Exception as e:
        logger.warning("[CV] OCR fallback failed: %s", e)
        return ""


def extract_text_from_image(file_path: str) -> str:
    """OCR a plain image file (PNG, JPG, WEBP…) and return cleaned text."""
    import io
    import os
    import pytesseract
    from PIL import Image

    for cand in (
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ):
        if os.path.exists(cand):
            pytesseract.pytesseract.tesseract_cmd = cand
            break

    try:
        img = Image.open(file_path).convert("RGB")
        # Upscale small images for better OCR accuracy
        w, h = img.size
        if max(w, h) < 1500:
            scale = 1500 / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        try:
            text = pytesseract.image_to_string(img, lang="fra+eng")
        except Exception:
            text = pytesseract.image_to_string(img)
        logger.info("[CV] image OCR produced %d chars", len(text))
        return _clean(text)
    except Exception as e:
        logger.warning("[CV] image OCR failed: %s", e)
        raise ValueError(f"Could not extract text from image: {e}")


def extract_text_from_pdf(file_path: str) -> str:
    """Return cleaned text from a PDF. Falls back to OCR if text layer is empty."""
    text_parts = []
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
    except Exception as e:
        raise ValueError(f"Could not extract text from PDF: {e}")

    text = _clean("\n".join(text_parts))
    if len(text) < 100:
        logger.info("[CV] text layer too short (%d chars) — trying OCR", len(text))
        ocr = _ocr_pdf(file_path)
        if len(ocr) > len(text):
            text = ocr
    return text
