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

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

try:
    from data.demo_data import INTERVENTIONS, WATERSHED_BOUNDARIES, WATERSHEDS
    from services.exif_service import extract_exif
    from services.spatial_service import match_nearest_intervention, match_watershed
    from services.storage_service import save_upload
    from services.validation_service import validate_coordinates
except ImportError:
    from ..data.demo_data import INTERVENTIONS, WATERSHED_BOUNDARIES, WATERSHEDS
    from ..services.exif_service import extract_exif
    from ..services.spatial_service import match_nearest_intervention, match_watershed
    from ..services.storage_service import save_upload
    from ..services.validation_service import validate_coordinates


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------


class ImageDimensions(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None


class ValidationResponse(BaseModel):
    valid: bool = False
    errors: List[str] = []


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


class EvidenceIngestResponse(BaseModel):
    """Full response from the evidence ingestion pipeline."""

    evidenceId: str
    filename: str
    storedFilename: str

    gpsAvailable: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    timestampAvailable: bool = False
    captureTimestamp: Optional[str] = None

    imageDimensions: Optional[ImageDimensions] = None

    validation: ValidationResponse
    watershedMatch: WatershedMatchResponse
    nearestIntervention: InterventionMatchResponse


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
    watershed matching → intervention matching → storage.

    Returns structured JSON with all extracted and matched metadata.
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

    # --- 6. Storage ---
    stored_filename = save_upload(image_bytes, original_filename)

    # --- 7. Build Response ---
    evidence_id = f"ev-upload-{uuid.uuid4().hex[:8]}"

    return EvidenceIngestResponse(
        evidenceId=evidence_id,
        filename=original_filename,
        storedFilename=stored_filename,
        gpsAvailable=exif_result.gps_available,
        latitude=exif_result.latitude,
        longitude=exif_result.longitude,
        timestampAvailable=exif_result.timestamp_available,
        captureTimestamp=exif_result.capture_timestamp,
        imageDimensions=ImageDimensions(
            width=exif_result.image_width,
            height=exif_result.image_height,
        ),
        validation=ValidationResponse(
            valid=coord_validation.valid,
            errors=coord_validation.errors,
        ),
        watershedMatch=watershed_match,
        nearestIntervention=intervention_match,
    )
