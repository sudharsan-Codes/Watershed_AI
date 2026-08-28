"""Spatial matching service for geo-coded field evidence.

Provides:
    1. Watershed polygon matching — determines if a GPS coordinate falls
       inside the watershed boundary using Shapely point-in-polygon.
    2. Intervention proximity matching — finds the nearest intervention
       within a configurable radius using Haversine distance.

Configuration:
    MAX_INTERVENTION_MATCH_RADIUS_METERS: float
        Maximum distance (in meters) for associating a photo with an
        intervention. Default: 500m. Chosen because the demo watershed
        is ~4km across with interventions ~500m apart. This is a clearly
        documented prototype value that can be adjusted.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from shapely.geometry import Point, shape

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Maximum distance in meters to associate a photo with an intervention.
# Prototype value — adjust for production based on field requirements.
MAX_INTERVENTION_MATCH_RADIUS_METERS: float = 500.0

# Approximate meters per degree at the equator (WGS84).
# Used for rough distance estimation from Shapely's degree-based distance.
_METERS_PER_DEGREE_LAT: float = 111_320.0

# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass
class WatershedMatchResult:
    """Result of matching a GPS point against a watershed polygon."""

    matched: bool = False
    watershed_id: Optional[str] = None
    watershed_name: Optional[str] = None
    distance_meters: Optional[float] = None


@dataclass
class InterventionMatchResult:
    """Result of matching a GPS point to the nearest intervention."""

    matched: bool = False
    intervention_id: Optional[str] = None
    code: Optional[str] = None
    type: Optional[str] = None
    distance_meters: Optional[float] = None


# ---------------------------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------------------------


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute the great-circle distance between two WGS84 points in meters.

    Uses the Haversine formula.

    Args:
        lat1, lon1: First point (decimal degrees).
        lat2, lon2: Second point (decimal degrees).

    Returns:
        Distance in meters.
    """
    R = 6_371_000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


# ---------------------------------------------------------------------------
# Watershed matching
# ---------------------------------------------------------------------------


def match_watershed(
    latitude: float,
    longitude: float,
    watershed_boundaries: Dict[str, Dict[str, Any]],
    watersheds: List[Dict[str, Any]],
) -> WatershedMatchResult:
    """Test whether a GPS point lies inside any known watershed polygon.

    Iterates over all watershed boundaries and checks containment.
    If the point is outside all watersheds, returns matched=False with
    the distance to the nearest boundary in meters.

    Args:
        latitude: GPS latitude (decimal degrees).
        longitude: GPS longitude (decimal degrees).
        watershed_boundaries: Dict mapping watershed_id to GeoJSON Feature.
        watersheds: List of watershed metadata dicts (for name lookup).

    Returns:
        WatershedMatchResult.
    """
    point = Point(longitude, latitude)  # GeoJSON uses (lon, lat) order

    best_result: Optional[WatershedMatchResult] = None
    best_distance_deg: Optional[float] = None

    for ws_id, feature in watershed_boundaries.items():
        geometry = feature.get("geometry")
        if not geometry:
            continue

        try:
            polygon = shape(geometry)
        except Exception:
            continue

        # Look up watershed name
        ws_meta = next((ws for ws in watersheds if ws["id"] == ws_id), None)
        ws_name = ws_meta["name"] if ws_meta else ws_id

        if polygon.contains(point):
            return WatershedMatchResult(
                matched=True,
                watershed_id=ws_id,
                watershed_name=ws_name,
                distance_meters=0.0,
            )

        # Compute distance in degrees, then approximate to meters
        dist_deg = point.distance(polygon)
        if best_distance_deg is None or dist_deg < best_distance_deg:
            best_distance_deg = dist_deg
            # Approximate degree → meters using latitude-adjusted factor
            meters_per_deg = _METERS_PER_DEGREE_LAT * math.cos(math.radians(latitude))
            best_result = WatershedMatchResult(
                matched=False,
                watershed_id=ws_id,
                watershed_name=ws_name,
                distance_meters=round(dist_deg * meters_per_deg, 1),
            )

    if best_result is not None:
        return best_result

    return WatershedMatchResult()


# ---------------------------------------------------------------------------
# Intervention proximity matching
# ---------------------------------------------------------------------------


def match_nearest_intervention(
    latitude: float,
    longitude: float,
    interventions: List[Dict[str, Any]],
    max_radius_meters: float = MAX_INTERVENTION_MATCH_RADIUS_METERS,
) -> InterventionMatchResult:
    """Find the nearest intervention to a GPS point within a maximum radius.

    Uses Haversine distance for accurate results on a spherical Earth.

    Args:
        latitude: GPS latitude (decimal degrees).
        longitude: GPS longitude (decimal degrees).
        interventions: List of intervention dicts with lat/lon.
        max_radius_meters: Maximum matching radius in meters.
            Default: 500m (prototype value).

    Returns:
        InterventionMatchResult. If no intervention is within the radius,
        matched is False and the nearest intervention info is still returned
        with its actual distance for informational purposes.
    """
    if not interventions:
        return InterventionMatchResult()

    nearest: Optional[Dict[str, Any]] = None
    nearest_distance: float = float("inf")

    for iv in interventions:
        iv_lat = iv.get("latitude")
        iv_lon = iv.get("longitude")
        if iv_lat is None or iv_lon is None:
            continue

        dist = haversine_meters(latitude, longitude, iv_lat, iv_lon)
        if dist < nearest_distance:
            nearest_distance = dist
            nearest = iv

    if nearest is None:
        return InterventionMatchResult()

    matched = nearest_distance <= max_radius_meters

    return InterventionMatchResult(
        matched=matched,
        intervention_id=nearest.get("id"),
        code=nearest.get("code"),
        type=nearest.get("type"),
        distance_meters=round(nearest_distance, 1),
    )
