"""Automated validation script for WATERSIGHT AI FastAPI backend."""

import sys
import threading
import time
import urllib.request
import urllib.error
import json

try:
    from main import app
    from routers.health import get_health
    from routers.watersheds import get_watersheds, get_watershed, get_watershed_geo, get_watershed_interventions
    from routers.interventions import get_intervention, get_intervention_evidence
except ImportError:
    from backend.main import app
    from backend.routers.health import get_health
    from backend.routers.watersheds import get_watersheds, get_watershed, get_watershed_geo, get_watershed_interventions
    from backend.routers.interventions import get_intervention, get_intervention_evidence

from fastapi import HTTPException


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


def test_http_server():
    print("\n--- 2. Testing HTTP Server over Network ---")
    import uvicorn

    server = uvicorn.Server(
        config=uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="warning")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    time.sleep(1.0)
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

    server.should_exit = True
    print("\nALL HTTP AND ROUTE TESTS PASSED!")


if __name__ == "__main__":
    test_units()
    test_http_server()
