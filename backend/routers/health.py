from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def get_health():
    """Health check endpoint."""
    return {"status": "ok"}
