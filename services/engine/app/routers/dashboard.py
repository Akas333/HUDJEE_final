from fastapi import APIRouter, HTTPException, Query
from app.db.supabase import get_supabase
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class DashboardSummaryResponse(BaseModel):
    time_invested_insight: str
    streak_insight: str
    strongest_subject_insight: str
    needs_attention_insight: Optional[str] = None
    arena_movement_insight: Optional[str] = None
    social_rank_insight: Optional[str] = None

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(user_id: str = Query(..., description="The ID of the user")):
    if user_id == "anonymous":
        return {
            "time_invested_insight": "0hrs 0mins yesterday",
            "streak_insight": "0-day streak — start today!",
            "strongest_subject_insight": "Keep practicing to see your strongest subject",
            "needs_attention_insight": None,
            "arena_movement_insight": None,
            "social_rank_insight": None
        }
        
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    past_30_days = today - timedelta(days=30)
    past_7_days = today - timedelta(days=7)
    
    # 1. TIME INVESTED
    time_res = sb.table("answer_events") \
                 .select("time_taken_ms, answered_at") \
                 .eq("user_id", user_id) \
                 .gte("answered_at", past_30_days.isoformat()) \
                 .execute()
                 
    yesterday_ms = 0
    total_ms = 0
    days_with_activity = set()
    
    for event in time_res.data:
        t_ms = event.get("time_taken_ms", 0)
        ans_at_str = event.get("answered_at")
        if not ans_at_str: continue
        
        try:
            ans_dt = datetime.fromisoformat(ans_at_str.replace('Z', '+00:00'))
        except ValueError:
            ans_dt = None
            
        if ans_dt:
            date_key = ans_dt.date()
            days_with_activity.add(date_key)
            total_ms += t_ms
            
            if yesterday <= ans_dt < today:
                yesterday_ms += t_ms

    y_hrs = yesterday_ms // 3600000
    y_mins = (yesterday_ms // 60000) % 60
    
    num_days = len(days_with_activity) if len(days_with_activity) > 0 else 1
    avg_ms = total_ms / num_days
    
    time_str = f"{y_hrs}hrs {y_mins}mins yesterday"
    if yesterday_ms > avg_ms * 1.1:
        time_str += " — a bit above your average"
    elif yesterday_ms < avg_ms * 0.9 and yesterday_ms > 0:
        time_str += " — slightly below your average"
    elif yesterday_ms == 0:
        time_str = "No practice yesterday — let's bounce back!"
    else:
        time_str += " — right on track with your average"
        
    # 2. STREAK
    prof_res = sb.table("profiles").select("current_streak").eq("id", user_id).execute()
    streak = prof_res.data[0].get("current_streak", 0) if prof_res.data else 0
    streak_str = f"{streak}-day streak — keep it going" if streak > 0 else "0-day streak — start today!"
    
    # 3 & 4. STRONGEST SUBJECT & NEEDS ATTENTION
    events_7_res = sb.table("answer_events") \
                     .select("is_correct, question_id") \
                     .eq("user_id", user_id) \
                     .gte("answered_at", past_7_days.isoformat()) \
                     .execute()
                     
    strongest_subject_str = "Keep practicing to see your strongest subject"
    needs_attention_str = None
    
    if events_7_res.data:
        q_ids = list(set(e["question_id"] for e in events_7_res.data))
        
        q_map = {}
        chunk_size = 200
        for i in range(0, len(q_ids), chunk_size):
            chunk = q_ids[i:i + chunk_size]
            qs_res = sb.table("questions").select("id, subject, concept_id").in_("id", chunk).execute()
            for q in qs_res.data:
                q_map[q["id"]] = q
                
        subject_stats = {}
        topic_stats = {}
        
        for e in events_7_res.data:
            q_id = e["question_id"]
            is_correct = e.get("is_correct", False)
            q_info = q_map.get(q_id)
            if not q_info: continue
            
            sub = q_info.get("subject")
            topic_id = q_info.get("concept_id")
            
            if sub:
                if sub not in subject_stats: subject_stats[sub] = {"correct": 0, "total": 0}
                subject_stats[sub]["total"] += 1
                if is_correct: subject_stats[sub]["correct"] += 1
                
            if topic_id:
                if topic_id not in topic_stats: topic_stats[topic_id] = {"correct": 0, "total": 0}
                topic_stats[topic_id]["total"] += 1
                if is_correct: topic_stats[topic_id]["correct"] += 1
                
        if subject_stats:
            best_sub = max(subject_stats.items(), key=lambda x: (x[1]["correct"], x[1]["correct"]/x[1]["total"] if x[1]["total"] > 0 else 0))
            if best_sub[1]["correct"] > 0:
                best_sub_name = best_sub[0].capitalize()
                strongest_subject_str = f"{best_sub_name} is pulling ahead this week"
                
        weak_topics = [(tid, stats) for tid, stats in topic_stats.items() if stats["total"] >= 3]
        if weak_topics:
            weakest_tid, w_stats = min(weak_topics, key=lambda x: x[1]["correct"] / x[1]["total"])
            topic_res = sb.table("topics").select("name").eq("id", weakest_tid).execute()
            if topic_res.data:
                t_name = topic_res.data[0].get("name", "A topic")
                needs_attention_str = f"{t_name} could use another pass"
                
    # 5. ARENA MOVEMENT
    cps_res = sb.table("cps_scores") \
                .select("score, valid_for_date") \
                .eq("user_id", user_id) \
                .gte("valid_for_date", past_7_days.date().isoformat()) \
                .order("valid_for_date", desc=True) \
                .execute()
                
    arena_movement_str = None
    if cps_res.data and len(cps_res.data) >= 2:
        current_score = cps_res.data[0].get("score", 0)
        oldest_score = cps_res.data[-1].get("score", 0)
        delta = current_score - oldest_score
        if delta > 0:
            arena_movement_str = f"Rating up {delta} points this week"
        elif delta < 0:
            arena_movement_str = f"Rating down {abs(delta)} points this week"
        else:
            arena_movement_str = "Rating held steady this week"
            
    # 6. SOCIAL RANK
    friends_res1 = sb.table("friendships").select("recipient_id").eq("requester_id", user_id).eq("status", "accepted").execute()
    friends_res2 = sb.table("friendships").select("requester_id").eq("recipient_id", user_id).eq("status", "accepted").execute()
    
    friend_ids = [user_id]
    if friends_res1.data: friend_ids.extend(f["recipient_id"] for f in friends_res1.data)
    if friends_res2.data: friend_ids.extend(f["requester_id"] for f in friends_res2.data)
    
    social_rank_str = None
    if len(friend_ids) > 1:
        ranks_res = sb.table("profiles").select("id, total_xp").in_("id", friend_ids).execute()
        if ranks_res.data:
            sorted_friends = sorted(ranks_res.data, key=lambda x: x.get("total_xp", 0), reverse=True)
            try:
                my_rank = next(i for i, v in enumerate(sorted_friends) if v["id"] == user_id) + 1
                social_rank_str = f"You're #{my_rank} among your friends"
            except StopIteration:
                pass

    return DashboardSummaryResponse(
        time_invested_insight=time_str,
        streak_insight=streak_str,
        strongest_subject_insight=strongest_subject_str,
        needs_attention_insight=needs_attention_str,
        arena_movement_insight=arena_movement_str,
        social_rank_insight=social_rank_str
    )
