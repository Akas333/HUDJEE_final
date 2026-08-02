from fastapi import APIRouter, HTTPException, Query
from app.db.supabase import get_supabase
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel

router = APIRouter()

class DashboardSummaryResponse(BaseModel):
    time_spent_yesterday_ms: int
    questions_solved_yesterday: int
    total_topics_covered: int

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(user_id: str = Query(..., description="The ID of the user")):
    if user_id == "anonymous":
        return {
            "time_spent_yesterday_ms": 0,
            "questions_solved_yesterday": 0,
            "total_topics_covered": 0
        }
        
    sb = get_supabase()
    
    # Calculate yesterday's boundaries in UTC
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    
    yesterday_iso = yesterday.isoformat()
    today_iso = today.isoformat()
    
    # Fetch answer events for yesterday
    res = sb.table("answer_events") \
            .select("time_taken_ms, question_id") \
            .eq("user_id", user_id) \
            .gte("answered_at", yesterday_iso) \
            .lt("answered_at", today_iso) \
            .execute()
    
    questions_solved_yesterday = len(res.data)
    time_spent_yesterday_ms = sum(event.get("time_taken_ms", 0) for event in res.data)
    
    # Fetch total unique topics covered
    all_events_res = sb.table("answer_events") \
                       .select("question_id") \
                       .eq("user_id", user_id) \
                       .execute()
                       
    q_ids = list(set(e["question_id"] for e in all_events_res.data))
    
    total_topics = 0
    if q_ids:
        # Split into chunks if there are too many question IDs (Supabase limit is usually ~100-1000 for IN clauses)
        chunk_size = 200
        topics = set()
        for i in range(0, len(q_ids), chunk_size):
            chunk = q_ids[i:i + chunk_size]
            qs_res = sb.table("questions").select("concept_id").in_("id", chunk).execute()
            for q in qs_res.data:
                if q.get("concept_id"):
                    topics.add(q["concept_id"])
        total_topics = len(topics)
        
    return {
        "time_spent_yesterday_ms": time_spent_yesterday_ms,
        "questions_solved_yesterday": questions_solved_yesterday,
        "total_topics_covered": total_topics
    }
