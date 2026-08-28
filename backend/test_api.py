"""Automated validation script for WATERSIGHT AI FastAPI backend.

Includes both the original tests for existing endpoints and the new
evidence ingestion pipeline tests (Phase 9).
"""

import sys
import threading
import time
import urllib.request
import urllib.error
import json
import io
import struct

try:
    from main import app
    from routers.health import get_health
    from routers.watersheds import get_watersheds, get_watershed, get_watershed_geo, get_watershed_interventions
    from routers.interventions import get_intervention, get_intervention_evidence
    from services.exif_service import extract_exif
    from services.validation_service import validate_coordinates
    from services.spatial_service import (
        match_watershed, match_nearest_intervention, haversine_meters,
    )
    from data.demo_data import WATERSHED_BOUNDARIES, WATERSHEDS, INTERVENTIONS
except ImportError:
    from backend.main import app
    from backend.routers.health import get_health
    from backend.routers.watersheds import get_watersheds, get_watershed, get_watershed_geo, get_watershed_interventions
    from backend.routers.interventions import get_intervention, get_intervention_evidence
    from backend.services.exif_service import extract_exif
    from backend.services.validation_service import validate_coordinates
    from backend.services.spatial_service import (
        match_watershed, match_nearest_intervention, haversine_meters,
    )
    from backend.data.demo_data import WATERSHED_BOUNDARIES, WATERSHEDS, INTERVENTIONS

from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Helpers: Generate minimal test images in pure Python (no internet needed)
# ---------------------------------------------------------------------------

def _make_minimal_jpeg() -> bytes:
    """Create a minimal valid JPEG file (no EXIF)."""
    # Smallest valid JPEG: SOI + DQT + SOF0 + DHT + SOS + EOI
    # For simplicity, use PIL to create a tiny image
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (2, 2), color=(128, 128, 128))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_jpeg_with_exif(
    lat: float = 11.0168,
    lon: float = 76.9558,
    timestamp: str = "2026:08:20 14:30:00",
    include_gps: bool = True,
    include_timestamp: bool = True,
) -> bytes:
    """Create a JPEG with EXIF GPS and/or timestamp data.

    Uses Pillow to construct a valid image with EXIF metadata.
    Does NOT depend on internet access.
    """
    from PIL import Image
    import piexif

    # Create a small test image
    img = Image.new("RGB", (100, 80), color=(64, 128, 64))

    exif_dict: dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}}

    if include_gps:
        # Convert decimal degrees to DMS for EXIF
        def _to_dms_rational(value: float) -> tuple:
            """Convert decimal degrees to EXIF DMS rational tuples."""
            d = int(abs(value))
            m = int((abs(value) - d) * 60)
            s = int(((abs(value) - d) * 60 - m) * 60 * 10000)
            return ((d, 1), (m, 1), (s, 10000))

        lat_ref = b"N" if lat >= 0 else b"S"
        lon_ref = b"E" if lon >= 0 else b"W"

        exif_dict["GPS"][piexif.GPSIFD.GPSLatitudeRef] = lat_ref
        exif_dict["GPS"][piexif.GPSIFD.GPSLatitude] = _to_dms_rational(lat)
        exif_dict["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lon_ref
        exif_dict["GPS"][piexif.GPSIFD.GPSLongitude] = _to_dms_rational(lon)

    if include_timestamp:
        exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = timestamp.encode("ascii")

    exif_bytes = piexif.dump(exif_dict)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_bytes)
    return buf.getvalue()


def _make_jpeg_with_exif_simple(
    include_gps: bool = False,
    include_timestamp: bool = False,
) -> bytes:
    """Create a JPEG — optionally without GPS or timestamp.

    This fallback doesn't use piexif; it creates a plain JPEG
    (no EXIF, or with minimal EXIF via Pillow's built-in support).
    """
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (50, 50), color=(200, 100, 50))
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Check for piexif availability (for GPS-embedded test images)
# ---------------------------------------------------------------------------

_HAS_PIEXIF = False
try:
    import piexif
    _HAS_PIEXIF = True
except ImportError:
    pass


# ---------------------------------------------------------------------------
# 1. Original route unit tests (unchanged)
# ---------------------------------------------------------------------------

def test_units():
    print("--- 1. Testing Route Unit Logic ---")

    # Health
    assert get_health() == {"status": "ok"}
    print("[PASS] get_health() -> {'status': 'ok'}")

    # Watersheds
    ws_list = get_watersheds()
    assert len(ws_list) == 1 and ws_list[0]["id"] == "ws-demo-a"
    print(f"[PASS] get_watersheds() -> {len(ws_list)} watershed")

    # Single watershed
    ws = get_watershed("ws-demo-a")
    assert ws["name"] == "Demo Watershed A"
    print("[PASS] get_watershed('ws-demo-a') ->", ws["name"])

    # Watershed geo
    geo = get_watershed_geo("ws-demo-a")
    assert geo["type"] == "Feature" and geo["properties"]["id"] == "ws-demo-a-boundary"
    print("[PASS] get_watershed_geo('ws-demo-a') -> Feature boundary")

    # Watershed interventions
    ivs = get_watershed_interventions("ws-demo-a")
    assert len(ivs) == 3
    print(f"[PASS] get_watershed_interventions('ws-demo-a') -> {len(ivs)} interventions")

    # Single intervention
    iv = get_intervention("int-checkdam-024")
    assert iv["code"] == "Check Dam 024"
    print("[PASS] get_intervention('int-checkdam-024') ->", iv["code"])

    # Intervention evidence
    ev = get_intervention_evidence("int-checkdam-024")
    assert len(ev) == 1
    print(f"[PASS] get_intervention_evidence('int-checkdam-024') -> {len(ev)} records")

    # 404 Tests
    try:
        get_watershed("non-existent")
        assert False, "Should have raised 404"
    except HTTPException as e:
        assert e.status_code == 404
        print("[PASS] get_watershed('non-existent') -> 404")

    try:
        get_watershed_geo("non-existent")
        assert False, "Should have raised 404"
    except HTTPException as e:
        assert e.status_code == 404
        print("[PASS] get_watershed_geo('non-existent') -> 404")

    try:
        get_watershed_interventions("non-existent")
        assert False, "Should have raised 404"
    except HTTPException as e:
        assert e.status_code == 404
        print("[PASS] get_watershed_interventions('non-existent') -> 404")

    try:
        get_intervention("non-existent")
        assert False, "Should have raised 404"
    except HTTPException as e:
        assert e.status_code == 404
        print("[PASS] get_intervention('non-existent') -> 404")

    try:
        get_intervention_evidence("non-existent")
        assert False, "Should have raised 404"
    except HTTPException as e:
        assert e.status_code == 404
        print("[PASS] get_intervention_evidence('non-existent') -> 404")


# ---------------------------------------------------------------------------
# 2. Evidence ingestion unit tests (NEW — Phase 9)
# ---------------------------------------------------------------------------

def test_exif_extraction():
    """Test EXIF extraction service."""
    print("\n--- 2. Testing EXIF Extraction ---")

    # Test 2a: Image without EXIF (minimal JPEG)
    jpeg_no_exif = _make_minimal_jpeg()
    result = extract_exif(jpeg_no_exif, filename="no_exif.jpg")
    assert result.gps_available is False, "Should not have GPS"
    assert result.latitude is None
    assert result.longitude is None
    assert result.image_width is not None, "Should have dimensions"
    print("[PASS] Image without GPS EXIF -> gpsAvailable=False")

    # Test 2b: Non-image data
    result = extract_exif(b"this is not an image", filename="garbage.txt")
    assert result.gps_available is False
    assert len(result.errors) > 0
    print("[PASS] Non-image data -> errors reported, no fabrication")

    # Test 2c: Empty bytes
    result = extract_exif(b"", filename="empty.jpg")
    assert result.gps_available is False
    assert len(result.errors) > 0
    print("[PASS] Empty bytes -> errors reported")

    # Test 2d: Image with GPS (if piexif available)
    if _HAS_PIEXIF:
        jpeg_with_gps = _make_jpeg_with_exif(
            lat=11.0168, lon=76.9558,
            include_gps=True, include_timestamp=True,
        )
        result = extract_exif(jpeg_with_gps, filename="with_gps.jpg")
        assert result.gps_available is True, "Should detect GPS"
        assert result.latitude is not None
        assert result.longitude is not None
        # Allow small precision tolerance from DMS conversion
        assert abs(result.latitude - 11.0168) < 0.001, f"Lat {result.latitude} too far from 11.0168"
        assert abs(result.longitude - 76.9558) < 0.001, f"Lon {result.longitude} too far from 76.9558"
        assert result.timestamp_available is True
        assert result.capture_timestamp is not None
        print(f"[PASS] Image with GPS EXIF -> lat={result.latitude:.4f}, lon={result.longitude:.4f}")
        print(f"[PASS] Image with timestamp -> {result.capture_timestamp}")

        # Test 2e: Image with GPS but no timestamp
        jpeg_gps_only = _make_jpeg_with_exif(
            lat=11.0168, lon=76.9558,
            include_gps=True, include_timestamp=False,
        )
        result = extract_exif(jpeg_gps_only, filename="gps_only.jpg")
        assert result.gps_available is True
        assert result.timestamp_available is False
        assert result.capture_timestamp is None
        print("[PASS] Image with GPS but no timestamp -> timestampAvailable=False")
    else:
        print("[SKIP] piexif not installed — GPS EXIF tests skipped (install with: pip install piexif)")


def test_coordinate_validation():
    """Test coordinate validation service."""
    print("\n--- 3. Testing Coordinate Validation ---")

    # Test 3a: Valid coordinates
    result = validate_coordinates(11.0168, 76.9558, gps_available=True)
    assert result.valid is True
    assert len(result.errors) == 0
    print("[PASS] Valid coordinates (11.0168, 76.9558) -> valid=True")

    # Test 3b: Invalid latitude (too high)
    result = validate_coordinates(95.0, 76.9558, gps_available=True)
    assert result.valid is False
    assert any("Latitude" in e for e in result.errors)
    print("[PASS] Latitude 95.0 -> valid=False")

    # Test 3c: Invalid longitude (too low)
    result = validate_coordinates(11.0, -200.0, gps_available=True)
    assert result.valid is False
    assert any("Longitude" in e for e in result.errors)
    print("[PASS] Longitude -200.0 -> valid=False")

    # Test 3d: Both invalid
    result = validate_coordinates(-91.0, 181.0, gps_available=True)
    assert result.valid is False
    assert len(result.errors) == 2
    print("[PASS] Both lat=-91.0, lon=181.0 -> 2 errors")

    # Test 3e: Edge valid (poles and antimeridian)
    result = validate_coordinates(90.0, 180.0, gps_available=True)
    assert result.valid is True
    print("[PASS] Edge coordinates (90.0, 180.0) -> valid=True")

    result = validate_coordinates(-90.0, -180.0, gps_available=True)
    assert result.valid is True
    print("[PASS] Edge coordinates (-90.0, -180.0) -> valid=True")

    # Test 3f: No GPS available
    result = validate_coordinates(None, None, gps_available=False)
    assert result.valid is False
    assert any("No GPS" in e for e in result.errors)
    print("[PASS] No GPS available -> valid=False with clear message")


def test_watershed_matching():
    """Test watershed spatial matching."""
    print("\n--- 4. Testing Watershed Spatial Matching ---")

    # Test 4a: Point inside Demo Watershed A (center point)
    result = match_watershed(11.0168, 76.9558, WATERSHED_BOUNDARIES, WATERSHEDS)
    assert result.matched is True
    assert result.watershed_id == "ws-demo-a"
    assert result.watershed_name == "Demo Watershed A"
    assert result.distance_meters == 0.0
    print("[PASS] Point inside watershed (11.0168, 76.9558) -> matched=True")

    # Test 4b: Point clearly outside watershed (Delhi)
    result = match_watershed(28.6139, 77.2090, WATERSHED_BOUNDARIES, WATERSHEDS)
    assert result.matched is False
    assert result.distance_meters is not None
    assert result.distance_meters > 0
    print(f"[PASS] Point outside watershed (Delhi) -> matched=False, distance={result.distance_meters}m")

    # Test 4c: Point far away (London)
    result = match_watershed(51.5074, -0.1278, WATERSHED_BOUNDARIES, WATERSHEDS)
    assert result.matched is False
    print(f"[PASS] Point far outside (London) -> matched=False, distance={result.distance_meters}m")

    # Test 4d: Another point inside the polygon
    # Using a known interior point based on the polygon vertices
    result = match_watershed(11.015, 76.955, WATERSHED_BOUNDARIES, WATERSHEDS)
    assert result.matched is True
    print("[PASS] Another interior point (11.015, 76.955) -> matched=True")


def test_intervention_matching():
    """Test intervention proximity matching."""
    print("\n--- 5. Testing Intervention Proximity Matching ---")

    # Test 5a: Point exactly at Check Dam 024 (distance ~0)
    result = match_nearest_intervention(11.0168, 76.9558, INTERVENTIONS)
    assert result.matched is True
    assert result.intervention_id == "int-checkdam-024"
    assert result.distance_meters is not None
    assert result.distance_meters < 1.0  # Essentially zero
    print(f"[PASS] At intervention location -> matched=True, distance={result.distance_meters}m")

    # Test 5b: Point near Farm Pond 012
    result = match_nearest_intervention(11.0125, 76.9515, INTERVENTIONS)
    assert result.matched is True
    assert result.intervention_id == "int-farmpond-012"
    assert result.distance_meters is not None
    assert result.distance_meters < 500.0
    print(f"[PASS] Near Farm Pond 012 -> matched=True, distance={result.distance_meters}m")

    # Test 5c: Point far away (no match within 500m radius)
    result = match_nearest_intervention(28.6139, 77.2090, INTERVENTIONS, max_radius_meters=500.0)
    assert result.matched is False
    assert result.distance_meters is not None
    assert result.distance_meters > 500.0
    print(f"[PASS] Far away point (Delhi) -> matched=False, distance={result.distance_meters}m")

    # Test 5d: Empty interventions list
    result = match_nearest_intervention(11.0168, 76.9558, [])
    assert result.matched is False
    assert result.intervention_id is None
    print("[PASS] Empty interventions -> matched=False")

    # Test 5e: Haversine distance sanity check
    # Distance from equator to 1 degree north should be ~111km
    d = haversine_meters(0.0, 0.0, 1.0, 0.0)
    assert 110_000 < d < 112_000, f"1° lat should be ~111km, got {d}"
    print(f"[PASS] Haversine sanity: 1° latitude = {d:.0f}m (expected ~111,320m)")


# ---------------------------------------------------------------------------
# 3. HTTP server tests (original + evidence endpoint)
# ---------------------------------------------------------------------------

def test_http_server():
    print("\n--- 6. Testing HTTP Server over Network ---")
    import uvicorn

    server = uvicorn.Server(
        config=uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="warning")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    time.sleep(1.5)
    base_url = "http://127.0.0.1:8000"

    def fetch(path):
        req = urllib.request.Request(f"{base_url}{path}")
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))

    def fetch_status(path):
        try:
            req = urllib.request.Request(f"{base_url}{path}")
            with urllib.request.urlopen(req) as resp:
                return resp.status
        except urllib.error.HTTPError as e:
            return e.code

    # 1. Health
    status, data = fetch("/api/health")
    assert status == 200 and data == {"status": "ok"}
    print(f"[PASS] HTTP GET /api/health -> {status} {data}")

    # 2. Watersheds
    status, data = fetch("/api/watersheds")
    assert status == 200 and len(data) == 1
    print(f"[PASS] HTTP GET /api/watersheds -> {status} ({len(data)} items)")

    # 3. Watershed
    status, data = fetch("/api/watersheds/ws-demo-a")
    assert status == 200 and data["id"] == "ws-demo-a"
    print(f"[PASS] HTTP GET /api/watersheds/ws-demo-a -> {status} ({data['name']})")

    # 4. Watershed Geo
    status, data = fetch("/api/watersheds/ws-demo-a/geo")
    assert status == 200 and data["type"] == "Feature"
    print(f"[PASS] HTTP GET /api/watersheds/ws-demo-a/geo -> {status} (Feature)")

    # 5. Watershed Interventions
    status, data = fetch("/api/watersheds/ws-demo-a/interventions")
    assert status == 200 and len(data) == 3
    print(f"[PASS] HTTP GET /api/watersheds/ws-demo-a/interventions -> {status} ({len(data)} items)")

    # 6. Single Intervention
    status, data = fetch("/api/interventions/int-checkdam-024")
    assert status == 200 and data["code"] == "Check Dam 024"
    print(f"[PASS] HTTP GET /api/interventions/int-checkdam-024 -> {status} ({data['code']})")

    # 7. Intervention Evidence
    status, data = fetch("/api/interventions/int-checkdam-024/evidence")
    assert status == 200 and len(data) == 1
    print(f"[PASS] HTTP GET /api/interventions/int-checkdam-024/evidence -> {status} ({len(data)} items)")

    # 8. 404 tests
    assert fetch_status("/api/watersheds/invalid-id") == 404
    print("[PASS] HTTP GET /api/watersheds/invalid-id -> 404")

    assert fetch_status("/api/watersheds/invalid-id/geo") == 404
    print("[PASS] HTTP GET /api/watersheds/invalid-id/geo -> 404")

    assert fetch_status("/api/watersheds/invalid-id/interventions") == 404
    print("[PASS] HTTP GET /api/watersheds/invalid-id/interventions -> 404")

    assert fetch_status("/api/interventions/invalid-id") == 404
    print("[PASS] HTTP GET /api/interventions/invalid-id -> 404")

    assert fetch_status("/api/interventions/invalid-id/evidence") == 404
    print("[PASS] HTTP GET /api/interventions/invalid-id/evidence -> 404")

    # 9. OpenAPI docs
    status = fetch_status("/docs")
    assert status == 200
    print("[PASS] HTTP GET /docs -> 200")

    # --- NEW: Evidence ingestion HTTP tests ---
    print("\n--- 7. Testing Evidence Ingestion HTTP Endpoint ---")

    # Helper: multipart form upload
    def upload_image(image_bytes: bytes, filename: str = "test.jpg", content_type: str = "image/jpeg"):
        """Upload an image via multipart/form-data using urllib."""
        boundary = "----TestBoundary12345"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n"
            f"\r\n"
        ).encode("utf-8") + image_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        req = urllib.request.Request(
            f"{base_url}/api/evidence/ingest",
            data=body,
            method="POST",
        )
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode("utf-8")) if e.readable() else {}

    # Test 7a: Upload valid JPEG without EXIF
    jpeg_no_exif = _make_minimal_jpeg()
    status, data = upload_image(jpeg_no_exif, filename="no_gps.jpg")
    assert status == 200, f"Expected 200, got {status}"
    assert data["gpsAvailable"] is False
    assert data["latitude"] is None
    assert data["longitude"] is None
    assert data["validation"]["valid"] is False
    assert data["watershedMatch"]["matched"] is False
    assert data["nearestIntervention"]["matched"] is False
    assert data["filename"] == "no_gps.jpg"
    assert data["evidenceId"].startswith("ev-upload-")
    print(f"[PASS] POST /api/evidence/ingest (no GPS) -> {status}, gpsAvailable=False")

    # Test 7b: Upload JPEG with GPS EXIF (if piexif available)
    if _HAS_PIEXIF:
        # Point inside watershed, near Check Dam 024
        jpeg_with_gps = _make_jpeg_with_exif(lat=11.0168, lon=76.9558)
        status, data = upload_image(jpeg_with_gps, filename="field_photo.jpg")
        assert status == 200
        assert data["gpsAvailable"] is True
        assert data["latitude"] is not None
        assert data["longitude"] is not None
        assert data["validation"]["valid"] is True
        assert data["watershedMatch"]["matched"] is True
        assert data["watershedMatch"]["watershedId"] == "ws-demo-a"
        assert data["nearestIntervention"]["matched"] is True
        assert data["nearestIntervention"]["interventionId"] == "int-checkdam-024"
        assert data["timestampAvailable"] is True
        print(f"[PASS] POST /api/evidence/ingest (with GPS inside watershed) -> matched watershed + intervention")

        # Test 7c: Upload JPEG with GPS outside watershed
        jpeg_outside = _make_jpeg_with_exif(lat=28.6139, lon=77.2090)
        status, data = upload_image(jpeg_outside, filename="delhi_photo.jpg")
        assert status == 200
        assert data["gpsAvailable"] is True
        assert data["validation"]["valid"] is True
        assert data["watershedMatch"]["matched"] is False
        assert data["nearestIntervention"]["matched"] is False
        print(f"[PASS] POST /api/evidence/ingest (GPS outside watershed) -> no match, no fabrication")

        # Test 7d: Upload with GPS but no timestamp
        jpeg_no_ts = _make_jpeg_with_exif(
            lat=11.0168, lon=76.9558,
            include_gps=True, include_timestamp=False,
        )
        status, data = upload_image(jpeg_no_ts, filename="no_timestamp.jpg")
        assert status == 200
        assert data["timestampAvailable"] is False
        assert data["captureTimestamp"] is None
        print(f"[PASS] POST /api/evidence/ingest (no timestamp) -> timestampAvailable=False")
    else:
        print("[SKIP] piexif not installed — HTTP GPS tests skipped")

    server.should_exit = True
    print("\nALL HTTP AND ROUTE TESTS PASSED!")


if __name__ == "__main__":
    test_units()
    test_exif_extraction()
    test_coordinate_validation()
    test_watershed_matching()
    test_intervention_matching()
    test_http_server()
