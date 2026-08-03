from app.db.supabase import get_supabase
from datetime import datetime, timedelta, timezone

def test_queries(user_id):
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    past_7 = (now - timedelta(days=7)).isoformat()
    
    res = sb.table("answer_events") \
            .select("is_correct, questions(subject, concept_id)") \
            .eq("user_id", user_id) \
            .gte("answered_at", past_7) \
            .execute()
            
    print("Answer events with joined questions:", len(res.data))
    if len(res.data) > 0:
        print("Sample:", res.data[0])
        
if __name__ == "__main__":
    # use the test user id if we know one, else we'll just check if query compiles/executes
    test_queries("123e4567-e89b-12d3-a456-426614174000")
