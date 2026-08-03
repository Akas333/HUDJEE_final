from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import irt, cps, dashboard, jobs

app = FastAPI(title="HUDJEE Practice Daily Engine API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "hudjee-engine"}

# Include routers
app.include_router(irt.router, prefix="/irt", tags=["IRT"])
app.include_router(cps.router, prefix="/internal", tags=["CPS Batch"])
app.include_router(jobs.router, tags=["Jobs"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
