"""Coordinate validation service for geo-coded field evidence.

Validates extracted GPS coordinates against WGS84 bounds.

Validation Rules:
    - Latitude must be in [-90, +90].
    - Longitude must be in [-180, +180].
    - Coordinates must not be None if gpsAvailable is True.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ValidationResult:
    """Structured result from coordinate validation."""

    valid: bool = False
    errors: list[str] = field(default_factory=list)


def validate_coordinates(
    latitude: Optional[float],
    longitude: Optional[float],
    gps_available: bool,
) -> ValidationResult:
    """Validate extracted GPS coordinates.

    Args:
        latitude: Extracted latitude (may be None).
        longitude: Extracted longitude (may be None).
        gps_available: Whether GPS data was found in EXIF.

    Returns:
        ValidationResult indicating whether coordinates are usable.
    """
    result = ValidationResult()

    if not gps_available:
        result.errors.append("No GPS coordinates available in EXIF data")
        return result

    if latitude is None or longitude is None:
        result.errors.append("GPS marked as available but coordinates are None")
        return result

    errors: list[str] = []

    if not isinstance(latitude, (int, float)):
        errors.append(f"Latitude is not a number: {latitude!r}")
    elif latitude < -90.0 or latitude > 90.0:
        errors.append(
            f"Latitude {latitude} is out of valid range [-90, +90]"
        )

    if not isinstance(longitude, (int, float)):
        errors.append(f"Longitude is not a number: {longitude!r}")
    elif longitude < -180.0 or longitude > 180.0:
        errors.append(
            f"Longitude {longitude} is out of valid range [-180, +180]"
        )

    if errors:
        result.errors = errors
    else:
        result.valid = True

    return result
