"""EXIF metadata extraction service for geo-coded field evidence.

Extracts GPS coordinates, capture timestamp, and image dimensions from
uploaded photographs using Pillow's EXIF parser.

Data Integrity Rules:
    - If GPS data is not present in EXIF, gpsAvailable is False.
    - If timestamp is not present in EXIF, timestampAvailable is False.
    - No coordinates or timestamps are ever fabricated.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS


@dataclass
class ExifResult:
    """Structured result from EXIF extraction."""

    gps_available: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    timestamp_available: bool = False
    capture_timestamp: Optional[str] = None

    image_width: Optional[int] = None
    image_height: Optional[int] = None

    filename: str = ""
    errors: list[str] = field(default_factory=list)


def _dms_to_decimal(dms_tuple: tuple, ref: str) -> Optional[float]:
    """Convert EXIF GPS DMS (degrees, minutes, seconds) to decimal degrees.

    Args:
        dms_tuple: Tuple of (degrees, minutes, seconds) — each may be
            a float or an ``IFDRational``.
        ref: Cardinal direction reference ('N', 'S', 'E', 'W').

    Returns:
        Decimal degrees as float, or None if conversion fails.
    """
    try:
        degrees = float(dms_tuple[0])
        minutes = float(dms_tuple[1])
        seconds = float(dms_tuple[2])
        decimal = degrees + minutes / 60.0 + seconds / 3600.0
        if ref in ("S", "W"):
            decimal = -decimal
        return decimal
    except (TypeError, ValueError, IndexError, ZeroDivisionError):
        return None


def _extract_gps(exif_data: dict) -> tuple[Optional[float], Optional[float]]:
    """Extract GPS latitude and longitude from decoded EXIF data.

    Returns:
        (latitude, longitude) or (None, None) if GPS is absent.
    """
    gps_info = exif_data.get("GPSInfo")
    if not gps_info:
        return None, None

    # Decode GPS sub-tags if they are still numeric keys
    decoded_gps: dict = {}
    for key, value in gps_info.items():
        tag_name = GPSTAGS.get(key, key)
        decoded_gps[tag_name] = value

    lat_dms = decoded_gps.get("GPSLatitude")
    lat_ref = decoded_gps.get("GPSLatitudeRef")
    lon_dms = decoded_gps.get("GPSLongitude")
    lon_ref = decoded_gps.get("GPSLongitudeRef")

    if lat_dms is None or lat_ref is None or lon_dms is None or lon_ref is None:
        return None, None

    latitude = _dms_to_decimal(lat_dms, lat_ref)
    longitude = _dms_to_decimal(lon_dms, lon_ref)

    return latitude, longitude


def _extract_timestamp(exif_data: dict) -> Optional[str]:
    """Extract capture timestamp from EXIF and return ISO-formatted string.

    Tries ``DateTimeOriginal`` first, then ``DateTime`` as fallback.
    Returns None if neither is available.
    """
    raw: Optional[str] = exif_data.get("DateTimeOriginal") or exif_data.get("DateTime")
    if not raw or not isinstance(raw, str):
        return None

    # EXIF datetime format: "YYYY:MM:DD HH:MM:SS"
    try:
        dt = datetime.strptime(raw.strip(), "%Y:%m:%d %H:%M:%S")
        return dt.isoformat()
    except (ValueError, TypeError):
        return None


def extract_exif(image_bytes: bytes, filename: str = "") -> ExifResult:
    """Extract available EXIF metadata from raw image bytes.

    This is the main entry point for the EXIF extraction service.
    It handles corrupt/non-image files gracefully and never fabricates data.

    Args:
        image_bytes: Raw bytes of the uploaded image file.
        filename: Original filename for the result record.

    Returns:
        ExifResult with all available metadata populated.
    """
    result = ExifResult(filename=filename)

    # Attempt to open the image
    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        result.errors.append(f"Could not open image: {exc}")
        return result

    # Image dimensions
    result.image_width, result.image_height = image.size

    # Extract EXIF data
    exif_raw = image.getexif()
    if not exif_raw:
        result.errors.append("No EXIF metadata found in image")
        return result

    # Decode numeric EXIF tag IDs into human-readable names
    exif_data: dict = {}
    for tag_id, value in exif_raw.items():
        tag_name = TAGS.get(tag_id, tag_id)
        exif_data[tag_name] = value

    # GPS sub-IFD (tag 0x8825) needs special handling
    gps_ifd = exif_raw.get_ifd(0x8825)
    if gps_ifd:
        exif_data["GPSInfo"] = dict(gps_ifd)

    # Exif sub-IFD (tag 0x8769) — contains DateTimeOriginal etc.
    exif_sub_ifd = exif_raw.get_ifd(0x8769)
    if exif_sub_ifd:
        for tag_id, value in exif_sub_ifd.items():
            tag_name = TAGS.get(tag_id, tag_id)
            # Don't overwrite top-level tags
            if tag_name not in exif_data:
                exif_data[tag_name] = value

    # Extract GPS
    latitude, longitude = _extract_gps(exif_data)
    if latitude is not None and longitude is not None:
        result.gps_available = True
        result.latitude = latitude
        result.longitude = longitude
    else:
        result.errors.append("No GPS coordinates found in EXIF data")

    # Extract timestamp
    timestamp = _extract_timestamp(exif_data)
    if timestamp is not None:
        result.timestamp_available = True
        result.capture_timestamp = timestamp
    else:
        result.errors.append("No capture timestamp found in EXIF data")

    return result
