import os
import uuid
from pathlib import Path

from app.config import get_settings


def get_upload_path(filename: str) -> tuple[str, str]:
    """Generate a unique filename and return (stored_name, full_path)."""
    settings = get_settings()
    ext = Path(filename).suffix
    stored_name = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(settings.upload_dir, stored_name)
    return stored_name, full_path


def get_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    type_map = {
        ".xlsx": "excel",
        ".xls": "excel",
        ".csv": "csv",
        ".pdf": "pdf",
        ".docx": "docx",
        ".doc": "docx",
    }
    return type_map.get(ext, "unknown")


ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv", ".pdf", ".docx", ".doc"}


def is_allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS
