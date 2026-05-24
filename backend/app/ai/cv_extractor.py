"""Extract raw text from a PDF file using PyMuPDF (fitz)."""
import fitz  # PyMuPDF


def extract_text_from_pdf(file_path: str) -> str:
    """Return all text from a PDF, page by page, joined with newlines."""
    text_parts = []
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
    except Exception as e:
        raise ValueError(f"Could not extract text from PDF: {e}")
    return "\n".join(text_parts).strip()
