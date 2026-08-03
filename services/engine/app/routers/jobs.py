from fastapi import APIRouter, HTTPException, Depends
from app.db.supabase import get_supabase
import math

router = APIRouter()

# Note: In a real production setup, this would be protected by a Bearer token
# matching the one in the pg_cron schedule. We are simplifying for this MVP.
@router.post("/internal/recalibrate-items")
def recalibrate_items():
    """
    Nightly job to recalibrate all item difficulties (live_b) based on
    actual response data vs expected probability.
    """
    sb = get_supabase()
    
    # Fetch all published questions
    q_res = sb.table("questions").select("id, live_b, response_count, irt_discrimination, irt_guessing, calibration_confidence").eq("published", True).execute()
    questions = q_res.data
    
    if not questions:
        return {"status": "success", "recalibrated": 0}
        
    updates = []
    
    for q in questions:
        q_id = q["id"]
        current_live_b = q.get("live_b", -0.5)
        response_count = q.get("response_count", 0)
        a = q.get("irt_discrimination", 1.0) or 1.0
        c = q.get("irt_guessing", 0.0) or 0.0
        
        # Fetch answer events since last calibration for this question
        # For simplicity in this v1, we recalculate based on ALL historical answer events.
        # This is a bit slow if data is huge, but fine for bootstrapping.
        events_res = sb.table("answer_events").select("is_correct, theta_at_time").eq("question_id", q_id).execute()
        events = events_res.data
        
        if not events:
            continue
            
        new_response_count = len(events)
        
        # Determine K factor
        if new_response_count < 100:
            K = 0.1
            confidence = "provisional"
        elif new_response_count < 1000:
            K = 0.05
            confidence = "converging"
        else:
            K = 0.01
            confidence = "calibrated"
            
        # Calculate actual vs expected
        correct_count = sum(1 for e in events if e["is_correct"])
        actual_ratio = correct_count / new_response_count if new_response_count > 0 else 0
        
        # Calculate expected probability (average over all respondents' thetas at the time they answered)
        expected_sum = 0
        for e in events:
            theta = e.get("theta_at_time", 0.0)
            # IRT 3PL formula: P(theta) = c + (1 - c) / (1 + exp(-D * a * (theta - b)))
            # usually D=1.702 in normal ogive metric, or D=1 in logistic. We'll use D=1.
            p = c + (1 - c) / (1 + math.exp(-1.0 * a * (theta - current_live_b)))
            expected_sum += p
            
        expected_ratio = expected_sum / new_response_count if new_response_count > 0 else 0
        
        # Base formula: live_b = current_live_b + K * (expected_probability - actual_correct_ratio)
        # Note: If expected probability > actual ratio, it means the item is harder than we thought, so b should go UP.
        new_live_b = current_live_b + K * (expected_ratio - actual_ratio)
        
        # Update question record
        updates.append({
            "id": q_id,
            "live_b": new_live_b,
            "response_count": new_response_count,
            "calibration_confidence": confidence,
            "last_calibrated_at": "now()"
        })
        
    # Bulk upsert updates (assuming Supabase upsert supports this)
    if updates:
        # Splitting into batches if there are too many (Supabase limit is usually 1000)
        batch_size = 500
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i + batch_size]
            sb.table("questions").upsert(batch).execute()
            
    return {"status": "success", "recalibrated": len(updates)}
