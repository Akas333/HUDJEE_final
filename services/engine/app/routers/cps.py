from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.services.cps import batch_compute_cps
import os

router = APIRouter()

def verify_internal_secret(authorization: str = None):
    """
    Very basic check to ensure this endpoint is only hit by our internal Supabase pg_cron.
    """
    # In production, check against an environment variable
    pass

@router.post("/compute-cps")
def trigger_cps_batch():
    """
    Endpoint triggered nightly by Supabase pg_cron to compute CPS for all users.
    """
    try:
        # verify_internal_secret(auth_header)
        results = batch_compute_cps()
        return {"status": "success", "computed_users": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
