import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.config import settings


def validate_upload(file: UploadFile) -> None:
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PDF files are allowed. Got: {ext}",
        )


async def save_upload(file: UploadFile, subfolder: str = "cvs") -> str:
    validate_upload(file)
    dest_dir = Path(settings.UPLOAD_DIR) / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    dest_path = dest_dir / filename

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    with open(dest_path, "wb") as f:
        f.write(content)

    return str(dest_path)


def delete_file(file_path: str) -> None:
    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass
