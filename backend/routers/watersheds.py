from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

try:
    from data.demo_data import INTERVENTIONS, WATERSHED_BOUNDARIES, WATERSHEDS
except ImportError:
    from ..data.demo_data import INTERVENTIONS, WATERSHED_BOUNDARIES, WATERSHEDS

router = APIRouter(prefix="/api/watersheds", tags=["watersheds"])


@router.get("", response_model=List[Dict[str, Any]])
def get_watersheds():
    """Return all known watershed records."""
    return WATERSHEDS


@router.get("/{watershed_id}", response_model=Dict[str, Any])
def get_watershed(watershed_id: str):
    """Return a single watershed by its ID."""
    for ws in WATERSHEDS:
        if ws["id"] == watershed_id:
            return ws
    raise HTTPException(status_code=404, detail="Watershed not found")


@router.get("/{watershed_id}/geo", response_model=Dict[str, Any])
def get_watershed_geo(watershed_id: str):
    """Return GeoJSON boundary Feature for a watershed."""
    ws_exists = any(ws["id"] == watershed_id for ws in WATERSHEDS)
    if not ws_exists:
        raise HTTPException(status_code=404, detail="Watershed not found")

    boundary = WATERSHED_BOUNDARIES.get(watershed_id)
    if not boundary:
        raise HTTPException(status_code=404, detail="GeoJSON boundary not found for watershed")
    return boundary


@router.get("/{watershed_id}/interventions", response_model=List[Dict[str, Any]])
def get_watershed_interventions(watershed_id: str):
    """Return all interventions for a watershed."""
    ws_exists = any(ws["id"] == watershed_id for ws in WATERSHEDS)
    if not ws_exists:
        raise HTTPException(status_code=404, detail="Watershed not found")

    return [iv for iv in INTERVENTIONS if iv["watershedId"] == watershed_id]
