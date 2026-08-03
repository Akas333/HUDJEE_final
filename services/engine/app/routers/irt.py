from fastapi import APIRouter, HTTPException
from app.models.schemas import IRTEstimateRequest, SessionStartRequest, SessionStartResponse, AnswerSubmitRequest, AnswerSubmitResponse, SkipRequest, SkipResponse, ReportRequest
from app.services.irt import estimate_theta, select_next_question, get_initial_theta
from app.db.supabase import get_supabase
import uuid
import json

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


@router.post("/session/start", response_model=SessionStartResponse)
def start_session(request: SessionStartRequest):
    sb = get_supabase()
    
    try:
        uuid.UUID(request.chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter ID. Are you using mock data? Please navigate from a real chapter in the app.")
        
    # Fetch questions for the chapter/concept
    query = sb.table("questions").select("*").eq("chapter_id", request.chapter_id).eq("published", True)
    if request.concept_id:
        query = query.eq("concept_id", request.concept_id)
    try:
        res = query.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase fetch questions error: {e}")
        
    questions = res.data
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this chapter")
        
    excluded_q_ids = set()
    if request.user_id and request.user_id != 'anonymous':
        try:
            uuid.UUID(request.user_id)
            history_res = sb.table("answer_events").select("question_id").eq("user_id", request.user_id).eq("is_correct", True).execute()
            excluded_q_ids = {e["question_id"] for e in history_res.data}
        except ValueError:
            pass
            
    filtered_questions = [q for q in questions if q["id"] not in excluded_q_ids]
    
    session_id = str(uuid.uuid4())
    session_data = {
        "id": session_id,
        "config": {"chapter_id": request.chapter_id, "concept_id": request.concept_id},
        "status": "active",
        "adaptive_mode": True
    }
    
    if request.user_id and request.user_id != 'anonymous':
        try:
            uuid.UUID(request.user_id)
            session_data["user_id"] = request.user_id
        except ValueError:
            pass

    try:
        sb.table("sessions").insert(session_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session in DB: {e}")

    if not filtered_questions:
        return {
            "session_id": session_id,
            "first_question": None,
            "exhausted": True
        }
    
    initial_theta = 0.0
    current_bucket = 'medium'
    
    if request.user_id and request.user_id != 'anonymous' and request.concept_id:
        try:
            uuid.UUID(request.user_id)
            state_res = sb.table("user_concept_state").select("theta, current_bucket").eq("user_id", request.user_id).eq("concept_id", request.concept_id).execute()
            if state_res.data:
                initial_theta = state_res.data[0]["theta"]
                current_bucket = state_res.data[0]["current_bucket"]
        except ValueError:
            pass

    target_bucket_qs = [q for q in filtered_questions if q.get("author_difficulty_bucket", "medium") == current_bucket]
    if not target_bucket_qs:
        target_bucket_qs = filtered_questions
        
    available_items = [
        (q["id"], q.get("irt_discrimination", 1.0) or 1.0, q.get("live_b", q.get("irt_difficulty", -0.5)) or -0.5, q.get("irt_guessing", 0.0) or 0.0)
        for q in target_bucket_qs
    ]
    
    try:
        next_q_id = select_next_question(available_items=available_items, current_theta=initial_theta)
    except Exception:
        next_q_id = available_items[0][0]
        
    first_q = next((q for q in target_bucket_qs if q["id"] == next_q_id), target_bucket_qs[0])
    
    return {
        "session_id": session_id,
        "first_question": {
            "question_id": first_q["id"],
            "concept_id": first_q.get("concept_id", ""),
            "type": first_q["format"],
            "prompt": first_q["question_body"],
            "options": first_q.get("options") if isinstance(first_q.get("options"), dict) else ([o["text"] for o in first_q.get("options", [])] if first_q.get("options") else None),
        },
        "exhausted": False
    }


BUCKETS = ["easy", "slightly_easy", "medium", "slightly_medium", "slightly_hard", "hard"]
BUCKET_BOUNDS = {
    "easy": (-3.0, -2.0),
    "slightly_easy": (-2.0, -1.0),
    "medium": (-1.0, 0.0),
    "slightly_medium": (0.0, 1.0),
    "slightly_hard": (1.0, 2.0),
    "hard": (2.0, 3.0)
}
@router.post("/session/answer", response_model=AnswerSubmitResponse)
def submit_answer(request: AnswerSubmitRequest):
    sb = get_supabase()
    q_res = sb.table("questions").select("*").eq("id", request.question_id).execute()
    if not q_res.data:
        raise HTTPException(status_code=404, detail="Question not found")
    q = q_res.data[0]
    concept_id = q.get("concept_id")
    live_b = q.get("live_b", q.get("irt_difficulty", -0.5))
    
    user_id = request.user_id if request.user_id and request.user_id != 'anonymous' else None
    
    # 1. Fetch current concept state
    current_state = {
        "theta": 0.0,
        "current_bucket": "medium",
        "streak_correct": 0,
        "streak_incorrect": 0
    }
    if user_id and concept_id:
        try:
            uuid.UUID(user_id)
            state_res = sb.table("user_concept_state").select("*").eq("user_id", user_id).eq("concept_id", concept_id).execute()
            if state_res.data:
                current_state = state_res.data[0]
        except ValueError:
            pass

    theta_at_time = current_state["theta"]
    
    # 2. Insert answer event
    answer_data = {
        "session_id": request.session_id,
        "question_id": request.question_id,
        "is_correct": request.is_correct,
        "time_taken_ms": request.time_taken_ms,
        "theta_at_time": theta_at_time,
        "live_b_at_time": live_b
    }
    if user_id:
        answer_data["user_id"] = user_id
        
    sb.table("answer_events").insert(answer_data).execute()
    
    # 3. Update Streaks and bounds if user is logged in
    new_theta = theta_at_time
    current_bucket = current_state["current_bucket"]
    
    if user_id and concept_id:
        streak_c = current_state.get("streak_correct", 0)
        streak_i = current_state.get("streak_incorrect", 0)
        
        if request.is_correct:
            streak_c += 1
            streak_i = 0
        else:
            streak_i += 1
            streak_c = 0
            
        promoted = False
        demoted = False
        
        if streak_c >= 5:
            # Promote
            idx = BUCKETS.index(current_bucket)
            if idx < len(BUCKETS) - 1:
                current_bucket = BUCKETS[idx + 1]
                promoted = True
            streak_c = 0
        elif streak_i >= 2:
            # Demote
            idx = BUCKETS.index(current_bucket)
            if idx > 0:
                current_bucket = BUCKETS[idx - 1]
                demoted = True
            streak_i = 0
            
        # 4. Fetch all concept history to re-estimate theta
        events_res = sb.table("answer_events").select("question_id, is_correct").eq("session_id", request.session_id).execute()
        q_ids = [e["question_id"] for e in events_res.data]
        
        past_qs_res = sb.table("questions").select("id, irt_discrimination, live_b, irt_guessing").in_("id", q_ids).execute()
        past_qs_map = {pq["id"]: pq for pq in past_qs_res.data}
        
        responses = []
        for e in events_res.data:
            pq = past_qs_map.get(e["question_id"])
            if pq:
                responses.append((
                    pq.get("irt_discrimination", 1.0) or 1.0, 
                    pq.get("live_b", pq.get("irt_difficulty", 0.0)) or 0.0, 
                    pq.get("irt_guessing", 0.0) or 0.0, 
                    1 if e["is_correct"] else 0
                ))
                
        new_theta = estimate_theta(responses, theta_at_time)
        
        # 5. Apply bounds if promoted/demoted
        if promoted:
            new_theta = max(new_theta, BUCKET_BOUNDS[current_bucket][0])
            sb.table("user_concept_state").upsert({
                "user_id": user_id,
                "concept_id": concept_id,
                "theta": new_theta,
                "current_bucket": current_bucket,
                "streak_correct": streak_c,
                "streak_incorrect": streak_i,
                "last_promotion_at": "now()"
            }).execute()
        elif demoted:
            new_theta = min(new_theta, BUCKET_BOUNDS[current_bucket][1] - 0.01)
            sb.table("user_concept_state").upsert({
                "user_id": user_id,
                "concept_id": concept_id,
                "theta": new_theta,
                "current_bucket": current_bucket,
                "streak_correct": streak_c,
                "streak_incorrect": streak_i,
                "last_demotion_at": "now()"
            }).execute()
        else:
            sb.table("user_concept_state").upsert({
                "user_id": user_id,
                "concept_id": concept_id,
                "theta": new_theta,
                "current_bucket": current_bucket,
                "streak_correct": streak_c,
                "streak_incorrect": streak_i
            }).execute()

    else:
        # Anonymous users or no concept_id
        events_res = sb.table("answer_events").select("question_id, is_correct").eq("session_id", request.session_id).execute()
        q_ids = [e["question_id"] for e in events_res.data]
        past_qs_res = sb.table("questions").select("id, irt_discrimination, live_b, irt_guessing").in_("id", q_ids).execute()
        past_qs_map = {pq["id"]: pq for pq in past_qs_res.data}
        responses = []
        for e in events_res.data:
            pq = past_qs_map.get(e["question_id"])
            if pq:
                responses.append((
                    pq.get("irt_discrimination", 1.0) or 1.0, 
                    pq.get("live_b", pq.get("irt_difficulty", 0.0)) or 0.0, 
                    pq.get("irt_guessing", 0.0) or 0.0, 
                    1 if e["is_correct"] else 0
                ))
        new_theta = estimate_theta(responses, 0.0)

    # 6. Select Next Question
    sess_res = sb.table("sessions").select("config").eq("id", request.session_id).execute()
    if not sess_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    config = sess_res.data[0]["config"]
    if isinstance(config, str):
        config = json.loads(config)
    chapter_id = config.get("chapter_id")
    sess_concept_id = config.get("concept_id")
    
    query = sb.table("questions").select("*").eq("chapter_id", chapter_id).eq("published", True)
    if sess_concept_id:
        query = query.eq("concept_id", sess_concept_id)
        
    all_qs_res = query.execute()
    all_qs = all_qs_res.data
    
    historical_correct_q_ids = set()
    if user_id:
        hist_res = sb.table("answer_events").select("question_id").eq("user_id", user_id).eq("is_correct", True).execute()
        historical_correct_q_ids = {e["question_id"] for e in hist_res.data}
            
    # Include seen questions passed by frontend
    events_res = sb.table("answer_events").select("question_id, is_correct").eq("session_id", request.session_id).execute()
    q_ids = [e["question_id"] for e in events_res.data]
    
    excluded_q_ids = set(q_ids).union(historical_correct_q_ids).union(set(request.seen_question_ids))
    available_qs = [aq for aq in all_qs if aq["id"] not in excluded_q_ids]
    
    # Filter by current_bucket for next question!
    target_bucket_qs = [aq for aq in available_qs if aq.get("author_difficulty_bucket", "medium") == current_bucket]
    if not target_bucket_qs:
        target_bucket_qs = available_qs

    next_q_dict = None
    exhausted = False
    if not target_bucket_qs:
        exhausted = True
    else:
        available_items = [
            (aq["id"], aq.get("irt_discrimination", 1.0) or 1.0, aq.get("live_b", aq.get("irt_difficulty", 0.0)) or 0.0, aq.get("irt_guessing", 0.0) or 0.0)
            for aq in target_bucket_qs
        ]
        try:
            next_q_id = select_next_question(available_items=available_items, current_theta=new_theta)
            next_q = next((aq for aq in target_bucket_qs if aq["id"] == next_q_id), target_bucket_qs[0])
            next_q_dict = {
                "question_id": next_q["id"],
                "concept_id": next_q.get("concept_id", ""),
                "type": next_q["format"],
                "prompt": next_q["question_body"],
                "options": next_q.get("options") if isinstance(next_q.get("options"), dict) else ([o["text"] for o in next_q.get("options", [])] if next_q.get("options") else None),
            }
        except ValueError:
            exhausted = True
            
    solution_dict = {
        "steps": [q.get("solution", "")] if q.get("solution") else ["Solution steps available soon."],
        "misconception_tag": None
    }
    
    return {
        "session_id": request.session_id,
        "is_correct": request.is_correct,
        "solution": solution_dict,
        "next_question": next_q_dict,
        "exhausted": exhausted
    }
@router.post("/session/report")
def report_question(request: ReportRequest):
    sb = get_supabase()
    data = {
        "question_id": request.question_id,
        "reason": request.reason,
        "details": request.details
    }
    
    # Gracefully handle 'anonymous' UUID errors
    if request.user_id and request.user_id != 'anonymous':
        # Validate if it's a UUID format to prevent DB crash
        try:
            uuid.UUID(request.user_id)
            data["user_id"] = request.user_id
        except ValueError:
            pass

    try:
        sb.table("question_reports").insert(data).execute()
        return {"success": True}
    except Exception as e:
        print("ERROR REPORTING:", str(e))
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/session/skip", response_model=SkipResponse)
def skip_question(request: SkipRequest):
    sb = get_supabase()
    events_res = sb.table("answer_events").select("question_id").eq("session_id", request.session_id).execute()
    q_ids = [e["question_id"] for e in events_res.data] + [request.question_id]
    
    sess_res = sb.table("sessions").select("config").eq("id", request.session_id).execute()
    config = sess_res.data[0]["config"]
    if isinstance(config, str):
        config = json.loads(config)
    chapter_id = config.get("chapter_id")
    concept_id = config.get("concept_id")
    
    query = sb.table("questions").select("*").eq("chapter_id", chapter_id).eq("published", True)
    if concept_id:
        query = query.eq("concept_id", concept_id)
        
    all_qs_res = query.execute()
    all_qs = all_qs_res.data
    
    historical_correct_q_ids = set()
    if request.user_id and request.user_id != 'anonymous':
        try:
            uuid.UUID(request.user_id)
            hist_res = sb.table("answer_events").select("question_id").eq("user_id", request.user_id).eq("is_correct", True).execute()
            historical_correct_q_ids = {e["question_id"] for e in hist_res.data}
        except ValueError:
            pass
            
    excluded_q_ids = set(q_ids).union(historical_correct_q_ids).union(set(request.seen_question_ids))
    
    available_qs = [aq for aq in all_qs if aq["id"] not in excluded_q_ids]
    
    next_q_dict = None
    exhausted = False
    if not available_qs:
        exhausted = True
    else:
        next_q = available_qs[0]
        next_q_dict = {
            "question_id": next_q["id"],
            "concept_id": next_q.get("concept_id", ""),
            "type": next_q["format"],
            "prompt": next_q["question_body"],
            "options": next_q.get("options") if isinstance(next_q.get("options"), dict) else ([o["text"] for o in next_q.get("options", [])] if next_q.get("options") else None),
        }
        
    return {
        "next_question": next_q_dict,
        "concept_deferred": False,
        "chapter_exhausted": exhausted
    }
