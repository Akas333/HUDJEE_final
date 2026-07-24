from fastapi import APIRouter, HTTPException
from app.models.schemas import IRTEstimateRequest
from app.services.irt import estimate_theta

router = APIRouter()

@router.post("/estimate")
def compute_irt(request: IRTEstimateRequest):
    """
    Computes the updated IRT theta (ability score) for a user based on recent events.
    """
    if not request.recent_events:
        return {"theta": 0.0, "message": "No events provided"}

    # Convert to expected tuple format: (a, b, c, u)
    responses = [
        (e.discrimination, e.difficulty, e.guessing, 1 if e.is_correct else 0)
        for e in request.recent_events
    ]
    
    try:
        new_theta = estimate_theta(responses=responses, initial_theta=0.0)
        return {"user_id": request.user_id, "subject": request.subject, "theta": new_theta}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
