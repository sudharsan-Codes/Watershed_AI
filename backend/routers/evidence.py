"""Evidence ingestion API router for WATERSIGHT AI.

Provides POST /api/evidence/ingest endpoint that implements the
geo-coded field evidence pipeline:

    PHOTO UPLOAD → EXIF EXTRACTION → GPS + TIMESTAMP →
    COORDINATE VALIDATION → WATERSHED SPATIAL MATCH →
    INTERVENTION PROXIMITY MATCH → EVIDENCE RECORD

This directly supports SIH26015: Application of Geospatial Techniques
for visualization and analysis to interpret Geo-Coded Images to enhance
watershed Development Outcomes.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

try:
    from data.demo_data import INTERVENTIONS, WATERSHED_BOUNDARIES, WATERSHEDS
    from services.exif_service import extract_exif
    from services.spatial_service import match_nearest_intervention, match_watershed
    from services.storage_service import (
        get_all_evidence,
        get_evidence_by_id,
        save_evidence_record,
        save_upload,
        update_evidence_verification,
    )
    from services.validation_service import validate_coordinates
except ImportError:
    from ..data.demo_data import INTERVENTIONS, WATERSHED_BOUNDARIES, WATERSHEDS
    from ..services.exif_service import extract_exif
    from ..services.spatial_service import match_nearest_intervention, match_watershed
    from ..services.storage_service import (
        get_all_evidence,
        get_evidence_by_id,
        save_evidence_record,
        save_upload,
        update_evidence_verification,
    )
    from ..services.validation_service import validate_coordinates


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ImageDimensions(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None


class ValidationResponse(BaseModel):
    valid: bool = False
    errors: List[str] = []
    warnings: List[str] = []


class WatershedMatchResponse(BaseModel):
    matched: bool = False
    watershedId: Optional[str] = None
    watershedName: Optional[str] = None
    distanceMeters: Optional[float] = None


class InterventionMatchResponse(BaseModel):
    matched: bool = False
    interventionId: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    distanceMeters: Optional[float] = None


class VerificationResponse(BaseModel):
    status: str = "requires_verification"
    verifiedBy: Optional[str] = None
    verifiedAt: Optional[str] = None
    reviewNote: Optional[str] = None


class EvidenceIngestResponse(BaseModel):
    """Full response from the evidence ingestion pipeline."""

    evidenceId: str
    filename: str
    storedFilename: str

    gpsAvailable: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gpsSource: str = "NONE"
    gpsConfidence: str = "NONE"
    gpsStatus: str = "MISSING"

    timestampAvailable: bool = False
    captureTimestamp: Optional[str] = None
    timestampSource: str = "NONE"
    timestampConfidence: str = "NONE"

    imageDimensions: Optional[ImageDimensions] = None

    validation: ValidationResponse
    watershedMatch: WatershedMatchResponse
    nearestIntervention: InterventionMatchResponse
    verification: VerificationResponse = VerificationResponse()


class VerificationUpdateRequest(BaseModel):
    status: str
    reviewNote: Optional[str] = None


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

# Maximum file size: 20 MB (reasonable for field photographs)
_MAX_UPLOAD_BYTES: int = 20 * 1024 * 1024

# Accepted MIME type prefixes
_ACCEPTED_TYPES: tuple[str, ...] = ("image/",)


@router.post("/ingest", response_model=EvidenceIngestResponse)
async def ingest_evidence(image: UploadFile) -> EvidenceIngestResponse:
    """Ingest a geo-coded field photograph.

    Accepts a multipart/form-data upload with an ``image`` field.
    Runs the full evidence pipeline: EXIF extraction → validation →
    watershed matching → intervention matching → storage → registry persistence.

    Returns structured JSON with all extracted and matched metadata.
    All newly ingested evidence starts as 'requires_verification'.
    No data is fabricated — missing EXIF fields are reported honestly.
    """
    # --- 1. Input validation ---
    if image.content_type and not any(
        image.content_type.startswith(prefix) for prefix in _ACCEPTED_TYPES
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {image.content_type}. Expected an image file.",
        )

    # Read file bytes
    try:
        image_bytes = await image.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {exc}")

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(image_bytes) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    original_filename = image.filename or "unknown"

    # --- 2. EXIF Extraction ---
    exif_result = extract_exif(image_bytes, filename=original_filename)

    # --- 3. Coordinate Validation ---
    coord_validation = validate_coordinates(
        latitude=exif_result.latitude,
        longitude=exif_result.longitude,
        gps_available=exif_result.gps_available,
        gps_source=exif_result.gps_source,
        confidence=exif_result.gps_confidence,
    )

    # --- 4. Watershed Matching ---
    watershed_match = WatershedMatchResponse()
    if coord_validation.valid and exif_result.latitude is not None and exif_result.longitude is not None:
        ws_result = match_watershed(
            latitude=exif_result.latitude,
            longitude=exif_result.longitude,
            watershed_boundaries=WATERSHED_BOUNDARIES,
            watersheds=WATERSHEDS,
        )
        watershed_match = WatershedMatchResponse(
            matched=ws_result.matched,
            watershedId=ws_result.watershed_id,
            watershedName=ws_result.watershed_name,
            distanceMeters=ws_result.distance_meters,
        )

    # --- 5. Intervention Matching ---
    intervention_match = InterventionMatchResponse()
    if coord_validation.valid and exif_result.latitude is not None and exif_result.longitude is not None:
        iv_result = match_nearest_intervention(
            latitude=exif_result.latitude,
            longitude=exif_result.longitude,
            interventions=INTERVENTIONS,
        )
        intervention_match = InterventionMatchResponse(
            matched=iv_result.matched,
            interventionId=iv_result.intervention_id,
            code=iv_result.code,
            type=iv_result.type,
            distanceMeters=iv_result.distance_meters,
        )

    # --- 6. Binary Storage ---
    stored_filename = save_upload(image_bytes, original_filename)

    # --- 7. Evidence ID & Registry Persistence ---
    evidence_id = f"ev-upload-{uuid.uuid4().hex[:8]}"

    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    evidence_record: Dict[str, Any] = {
        "id": evidence_id,
        "filename": original_filename,
        "storedFilename": stored_filename,
        "gpsAvailable": exif_result.gps_available,
        "latitude": exif_result.latitude,
        "longitude": exif_result.longitude,
        "gpsSource": exif_result.gps_source,
        "gpsConfidence": exif_result.gps_confidence,
        "gpsStatus": exif_result.gps_status,
        "gpsRawText": exif_result.gps_raw_text,
        "timestampAvailable": exif_result.timestamp_available,
        "captureTimestamp": exif_result.capture_timestamp,
        "timestampSource": exif_result.timestamp_source,
        "timestampConfidence": exif_result.timestamp_confidence,
        "imageDimensions": {
            "width": exif_result.image_width,
            "height": exif_result.image_height,
        },
        "watershedMatch": {
            "matched": watershed_match.matched,
            "watershedId": watershed_match.watershedId,
            "watershedName": watershed_match.watershedName,
            "distanceMeters": watershed_match.distanceMeters,
        },
        "nearestIntervention": {
            "matched": intervention_match.matched,
            "interventionId": intervention_match.interventionId,
            "code": intervention_match.code,
            "type": intervention_match.type,
            "distanceMeters": intervention_match.distanceMeters,
        },
        "validation": {
            "valid": coord_validation.valid,
            "errors": coord_validation.errors,
            "warnings": coord_validation.warnings,
        },
        "verification": {
            "status": "requires_verification",
            "verifiedBy": None,
            "verifiedAt": None,
            "reviewNote": None,
        },
        "source": "uploaded",
        "createdAt": created_at,
    }

    # Persist to local JSON registry
    save_evidence_record(evidence_record)

    # --- 8. Build Response ---
    return EvidenceIngestResponse(
        evidenceId=evidence_id,
        filename=original_filename,
        storedFilename=stored_filename,
        gpsAvailable=exif_result.gps_available,
        latitude=exif_result.latitude,
        longitude=exif_result.longitude,
        gpsSource=exif_result.gps_source,
        gpsConfidence=exif_result.gps_confidence,
        gpsStatus=exif_result.gps_status,
        timestampAvailable=exif_result.timestamp_available,
        captureTimestamp=exif_result.capture_timestamp,
        timestampSource=exif_result.timestamp_source,
        timestampConfidence=exif_result.timestamp_confidence,
        imageDimensions=ImageDimensions(
            width=exif_result.image_width,
            height=exif_result.image_height,
        ),
        validation=ValidationResponse(
            valid=coord_validation.valid,
            errors=coord_validation.errors,
            warnings=coord_validation.warnings,
        ),
        watershedMatch=watershed_match,
        nearestIntervention=intervention_match,
        verification=VerificationResponse(
            status="requires_verification",
            verifiedBy=None,
            verifiedAt=None,
            reviewNote=None,
        ),
    )


@router.get("", response_model=List[Dict[str, Any]])
async def get_evidence_list(watershedId: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all persisted field evidence records from the registry.

    Supports optional filtering by watershedId.
    """
    return get_all_evidence(watershed_id=watershedId)


@router.get("/{evidence_id}", response_model=Dict[str, Any])
async def get_single_evidence(evidence_id: str) -> Dict[str, Any]:
    """Retrieve a single persisted evidence record by ID."""
    record = get_evidence_by_id(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Evidence with ID '{evidence_id}' not found.")
    return record


@router.patch("/{evidence_id}/verification", response_model=Dict[str, Any])
async def update_verification(
    evidence_id: str,
    request: VerificationUpdateRequest,
) -> Dict[str, Any]:
    """Update verification status of an evidence record.

    Allowed status values: 'requires_verification', 'verified', 'rejected'.
    Only mutates verification metadata without altering spatial, EXIF, or file paths.
    """
    allowed_statuses = {"requires_verification", "verified", "rejected"}
    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification status: '{request.status}'. Allowed values: {sorted(allowed_statuses)}",
        )

    updated = update_evidence_verification(
        evidence_id=evidence_id,
        status=request.status,
        review_note=request.reviewNote,
        verified_by="demo-reviewer",
    )
    if not updated:
        raise HTTPException(
            status_code=404,
            detail=f"Evidence with ID '{evidence_id}' not found.",
        )

    return updated


