from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

try:
    from routers import evidence, health, interventions, watersheds
    from services.storage_service import get_safe_upload_path
except ImportError:
    from .routers import evidence, health, interventions, watersheds
    from .services.storage_service import get_safe_upload_path

app = FastAPI(
    title="WATERSIGHT AI API",
    description="GIS Decision-Support API for WATERSIGHT AI",
    version="1.0.0",
)

# Development CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(watersheds.router)
app.include_router(interventions.router)
app.include_router(evidence.router)


@app.get("/uploads/{stored_filename}")
async def serve_upload(stored_filename: str):
    """Safely serve an uploaded evidence image.

    Prevents directory traversal and only serves files from the uploads directory.
    """
    file_path = get_safe_upload_path(stored_filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Image file not found or invalid path.")

    return FileResponse(file_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

