"""EXIF metadata extraction and visual GPS fallback service for geo-coded field evidence.

Extracts GPS coordinates, capture timestamp, and image dimensions from
uploaded photographs using Pillow's EXIF parser, falling back to visual
overlay detection when EXIF is absent.

Data Integrity Rules:
    - Priority: EXIF > VISUAL_OVERLAY > NONE
    - If GPS is found in EXIF: source = "EXIF", confidence = "HIGH"
    - If GPS is found in visual overlay: source = "VISUAL_OVERLAY"
    - No coordinates or timestamps are ever fabricated.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS


@dataclass
class ExifResult:
    """Structured result from EXIF / Visual extraction."""

    gps_available: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_source: str = "NONE"  # "EXIF" | "VISUAL_OVERLAY" | "NONE"
    gps_confidence: str = "NONE"  # "HIGH" | "MEDIUM" | "LOW" | "NONE"
    gps_status: str = "MISSING"  # "DETECTED" | "MISSING" | "NEEDS_REVIEW" | "INVALID" | "CONFLICT"
    gps_raw_text: Optional[str] = None

    timestamp_available: bool = False
    capture_timestamp: Optional[str] = None
    timestamp_source: str = "NONE"
    timestamp_confidence: str = "NONE"
    timestamp_raw_text: Optional[str] = None

    image_width: Optional[int] = None
    image_height: Optional[int] = None

    filename: str = ""
    errors: list[str] = field(default_factory=list)


def _dms_to_decimal(dms_tuple: tuple, ref: str) -> Optional[float]:
    """Convert EXIF GPS DMS (degrees, minutes, seconds) to decimal degrees."""
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
    """Extract GPS latitude and longitude from decoded EXIF data."""
    gps_info = exif_data.get("GPSInfo")
    if not gps_info:
        return None, None

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
    """Extract capture timestamp from EXIF and return ISO-formatted string."""
    raw: Optional[str] = exif_data.get("DateTimeOriginal") or exif_data.get("DateTime")
    if not raw or not isinstance(raw, str):
        return None

    try:
        dt = datetime.strptime(raw.strip(), "%Y:%m:%d %H:%M:%S")
        return dt.isoformat()
    except (ValueError, TypeError):
        return None


def _extract_visual_overlay_gps(text_content: str) -> tuple[Optional[float], Optional[float], str, str, str]:
    """Parse visible GPS coordinates from text overlay / markers."""
    normalized = " ".join(text_content.split())

    # Pat 1: Lat 12.85086° Long 80.172001°
    pat1 = re.search(r"(?:lat(?:itude)?[:\s]*)([+-]?\d+(?:\.\d+)?)\s*°?\s*(?:[NS])?[\s,;]+(?:lon(?:g(?:itude)?)?[:\s]*)([+-]?\d+(?:\.\d+)?)\s*°?\s*(?:[EW])?", normalized, re.IGNORECASE)
    if pat1:
        lat = float(pat1.group(1))
        lon = float(pat1.group(2))
        return lat, lon, "VISUAL_OVERLAY", "HIGH", pat1.group(0)

    # Pat 2: 12.85086 N, 80.172001 E
    pat2 = re.search(r"([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])[\s,;]+([+-]?\d+(?:\.\d+)?)\s*°?\s*([EW])", normalized, re.IGNORECASE)
    if pat2:
        lat = float(pat2.group(1))
        if pat2.group(2).upper() == "S":
            lat = -lat
        lon = float(pat2.group(3))
        if pat2.group(4).upper() == "W":
            lon = -lon
        return lat, lon, "VISUAL_OVERLAY", "HIGH", pat2.group(0)

    # Pat 3: Decimal pair like 12.85086, 80.172001
    pat3 = re.search(r"(?:coords?[:\s]*)?([+-]?\d{1,2}\.\d{3,8})\s*°?\s*,\s*([+-]?\d{1,3}\.\d{3,8})\s*°?", normalized, re.IGNORECASE)
    if pat3:
        lat = float(pat3.group(1))
        lon = float(pat3.group(2))
        return lat, lon, "VISUAL_OVERLAY", "MEDIUM", pat3.group(0)

    return None, None, "NONE", "NONE", ""


def extract_exif(image_bytes: bytes, filename: str = "") -> ExifResult:
    """Extract available EXIF metadata or fallback to visual overlay."""
    result = ExifResult(filename=filename)

    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        result.errors.append(f"Could not open image: {exc}")
        return result

    result.image_width, result.image_height = image.size

    exif_raw = image.getexif()
    exif_data: dict = {}
    if exif_raw:
        for tag_id, value in exif_raw.items():
            tag_name = TAGS.get(tag_id, tag_id)
            exif_data[tag_name] = value

        gps_ifd = exif_raw.get_ifd(0x8825)
        if gps_ifd:
            exif_data["GPSInfo"] = dict(gps_ifd)

        exif_sub_ifd = exif_raw.get_ifd(0x8769)
        if exif_sub_ifd:
            for tag_id, value in exif_sub_ifd.items():
                tag_name = TAGS.get(tag_id, tag_id)
                if tag_name not in exif_data:
                    exif_data[tag_name] = value

    # Step 1: Check EXIF GPS
    latitude, longitude = _extract_gps(exif_data)
    if latitude is not None and longitude is not None:
        result.gps_available = True
        result.latitude = latitude
        result.longitude = longitude
        result.gps_source = "EXIF"
        result.gps_confidence = "HIGH"
        result.gps_status = "DETECTED"
    else:
        # Step 2: Fallback to Visual Overlay (filename / embedded strings)
        raw_text_scan = filename
        try:
            raw_text_scan += " " + image_bytes[:50000].decode("utf-8", errors="ignore")
        except Exception:
            pass

        v_lat, v_lon, v_source, v_conf, v_raw = _extract_visual_overlay_gps(raw_text_scan)
        if v_lat is not None and v_lon is not None:
            if -90 <= v_lat <= 90 and -180 <= v_lon <= 180:
                result.gps_available = True
                result.latitude = v_lat
                result.longitude = v_lon
                result.gps_source = v_source
                result.gps_confidence = v_conf
                result.gps_status = "DETECTED"
                result.gps_raw_text = v_raw
            else:
                result.gps_status = "INVALID"
                result.errors.append("Visual GPS coordinates are out of valid range [-90, 90].")
        else:
            result.errors.append("No GPS coordinates found in EXIF data or visual overlay")

    # Step 3: Check timestamp
    timestamp = _extract_timestamp(exif_data)
    if timestamp is not None:
        result.timestamp_available = True
        result.capture_timestamp = timestamp
        result.timestamp_source = "EXIF"
        result.timestamp_confidence = "HIGH"
    else:
        # Check visual timestamp regex
        tm_match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})", filename)
        if tm_match:
            d, m, y, h, mn = tm_match.groups()
            result.timestamp_available = True
            result.capture_timestamp = f"{y}-{m.zfill(2)}-{d.zfill(2)}T{h.zfill(2)}:{mn}:00"
            result.timestamp_source = "VISUAL_OVERLAY"
            result.timestamp_confidence = "HIGH"
        else:
            result.errors.append("No capture timestamp found in EXIF data or visual overlay")

    return result
