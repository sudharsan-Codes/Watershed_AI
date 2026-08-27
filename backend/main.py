from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from routers import health, interventions, watersheds
except ImportError:
    from .routers import health, interventions, watersheds

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
