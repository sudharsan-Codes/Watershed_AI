from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

try:
    from data.demo_data import FIELD_EVIDENCE, INTERVENTIONS
except ImportError:
    from ..data.demo_data import FIELD_EVIDENCE, INTERVENTIONS

router = APIRouter(prefix="/api/interventions", tags=["interventions"])


@router.get("/{intervention_id}", response_model=Dict[str, Any])
def get_intervention(intervention_id: str):
    """Return a single intervention by its ID."""
    for iv in INTERVENTIONS:
        if iv["id"] == intervention_id:
            return iv
    raise HTTPException(status_code=404, detail="Intervention not found")


@router.get("/{intervention_id}/evidence", response_model=List[Dict[str, Any]])
def get_intervention_evidence(intervention_id: str):
    """Return all field evidence records for a specific intervention."""
    iv_exists = any(iv["id"] == intervention_id for iv in INTERVENTIONS)
    if not iv_exists:
        raise HTTPException(status_code=404, detail="Intervention not found")

    return [ev for ev in FIELD_EVIDENCE if ev["interventionId"] == intervention_id]
