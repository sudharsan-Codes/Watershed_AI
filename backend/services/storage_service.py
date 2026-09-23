"""Local file storage and evidence registry service for uploaded field evidence.

Stores uploaded images in backend/data/uploads/ with UUID-prefixed filenames
and persists metadata records in backend/data/evidence_registry.json.

Architecture Note:
    This service is intentionally minimal for the SIH prototype.
    It is designed to be easily replaceable with:
    - Object storage (S3, GCS, Azure Blob)
    - Database-backed storage (PostgreSQL + binary column)
    - CDN-backed storage
    The interface is the stable contract.

Security:
    - Does not expose full filesystem paths in API responses.
    - Sanitises filenames to prevent path traversal.
    - Validates paths strictly before serving files.
"""

from __future__ import annotations

import json
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_UPLOAD_DIR = _DATA_DIR / "uploads"
_REGISTRY_FILE = _DATA_DIR / "evidence_registry.json"


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


def get_safe_upload_path(stored_filename: str) -> Optional[Path]:
    """Validate and return safe path for a stored upload file.

    Guarantees that the file resides strictly within the upload directory
    and rejects any path traversal attempts.

    Args:
        stored_filename: The filename to look up.

    Returns:
        Path if valid and exists, None otherwise.
    """
    if not stored_filename or ".." in stored_filename or "/" in stored_filename or "\\" in stored_filename:
        return None

    upload_dir = get_upload_dir().resolve()
    target_path = (upload_dir / stored_filename).resolve()

    # Ensure target path is strictly inside upload_dir
    try:
        target_path.relative_to(upload_dir)
    except ValueError:
        return None

    if target_path.is_file():
        return target_path

    return None


# ---------------------------------------------------------------------------
# Evidence Registry Operations
# ---------------------------------------------------------------------------


def load_evidence_registry() -> List[Dict[str, Any]]:
    """Load all evidence records from the local registry JSON file.

    Returns an empty list if the registry file does not yet exist or is invalid.
    """
    if not _REGISTRY_FILE.exists():
        return []

    try:
        content = _REGISTRY_FILE.read_text(encoding="utf-8")
        data = json.loads(content)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []


def save_evidence_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Append a new evidence record to the local registry JSON file.

    Args:
        record: The structured evidence record dict.

    Returns:
        The saved record.
    """
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    registry = load_evidence_registry()

    # If already present with same id, replace it, otherwise prepend (latest first)
    existing_idx = next((i for i, r in enumerate(registry) if r.get("id") == record.get("id")), None)
    if existing_idx is not None:
        registry[existing_idx] = record
    else:
        registry.insert(0, record)

    _REGISTRY_FILE.write_text(json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8")
    return record


def get_all_evidence(watershed_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all evidence records, optionally filtered by watershed ID.

    Args:
        watershed_id: Optional watershed ID filter.

    Returns:
        List of evidence records.
    """
    registry = load_evidence_registry()
    if not watershed_id:
        return registry

    return [
        r for r in registry
        if r.get("watershedMatch", {}).get("watershedId") == watershed_id
    ]


def get_evidence_by_id(evidence_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single evidence record by its unique ID.

    Args:
        evidence_id: The evidence record ID.

    Returns:
        The record dict if found, None otherwise.
    """
    registry = load_evidence_registry()
    return next((r for r in registry if r.get("id") == evidence_id), None)


def update_evidence_verification(
    evidence_id: str,
    status: str,
    review_note: Optional[str] = None,
    verified_by: Optional[str] = "demo-reviewer",
) -> Optional[Dict[str, Any]]:
    """Update only the verification metadata of an existing evidence record.

    Guarantees that GPS coordinates, timestamp, watershed, intervention,
    and storage filename remain completely unaltered.

    Args:
        evidence_id: The unique ID of the evidence record.
        status: The new verification status ('requires_verification', 'verified', 'rejected').
        review_note: Optional reviewer note explaining the decision.
        verified_by: Reviewer identifier.

    Returns:
        The updated evidence record if found and updated, None otherwise.
    """
    import datetime

    registry = load_evidence_registry()
    idx = next((i for i, r in enumerate(registry) if r.get("id") == evidence_id), None)
    if idx is None:
        return None

    record = registry[idx]

    # Determine verifiedAt and verifiedBy based on status
    if status in ("verified", "rejected"):
        verified_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        reviewer = verified_by or "demo-reviewer"
    else:
        verified_at = None
        reviewer = None

    record["verification"] = {
        "status": status,
        "verifiedBy": reviewer,
        "verifiedAt": verified_at,
        "reviewNote": review_note,
    }

    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _REGISTRY_FILE.write_text(json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8")
    return record


