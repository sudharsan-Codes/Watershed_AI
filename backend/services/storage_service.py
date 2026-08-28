"""Local file storage service for uploaded field evidence images.

Stores uploaded images in backend/data/uploads/ with UUID-prefixed
filenames to avoid collisions.

Architecture Note:
    This service is intentionally minimal for the SIH prototype.
    It is designed to be easily replaceable with:
    - Object storage (S3, GCS, Azure Blob)
    - Database-backed storage (PostgreSQL + binary column)
    - CDN-backed storage
    The interface (save_upload, get_upload_dir) is the stable contract.

Security:
    - Does not expose full filesystem paths in API responses.
    - Sanitises filenames to prevent path traversal.
"""

from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Upload directory — relative to the backend/data/ directory.
_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"


def get_upload_dir() -> Path:
    """Return the upload directory path, creating it if necessary."""
    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return _UPLOAD_DIR


def _sanitize_filename(filename: str) -> str:
    """Sanitise a filename to prevent path traversal and special chars.

    Keeps alphanumeric characters, hyphens, underscores, and dots.
    Strips any directory components.
    """
    # Take only the basename (prevent path traversal)
    basename = os.path.basename(filename)
    # Remove anything that isn't alphanumeric, hyphen, underscore, or dot
    sanitized = re.sub(r"[^\w\-.]", "_", basename)
    # Collapse multiple underscores
    sanitized = re.sub(r"_+", "_", sanitized)
    return sanitized or "unnamed_upload"


def save_upload(image_bytes: bytes, original_filename: str) -> str:
    """Save uploaded image bytes to the upload directory.

    Args:
        image_bytes: Raw bytes of the uploaded image.
        original_filename: Original filename from the upload.

    Returns:
        The stored filename (UUID-prefixed, sanitised).
        Does NOT return the full filesystem path for security.
    """
    upload_dir = get_upload_dir()
    safe_name = _sanitize_filename(original_filename)
    unique_prefix = uuid.uuid4().hex[:12]
    stored_filename = f"{unique_prefix}_{safe_name}"

    filepath = upload_dir / stored_filename
    filepath.write_bytes(image_bytes)

    return stored_filename
