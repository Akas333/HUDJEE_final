from fastapi import APIRouter, HTTPException
from app.models.schemas import IRTEstimateRequest, SessionStartRequest, SessionStartResponse, AnswerSubmitRequest, AnswerSubmitResponse, SkipRequest, SkipResponse
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
    # Fetch questions for the chapter
    res = sb.table("questions").select("*").eq("chapter_id", request.chapter_id).execute()
    questions = res.data
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this chapter")
    
    initial_theta = get_initial_theta()
    
    # Format for select_next_question: List[Tuple[int, float, float, float]]
    available_items = [
        (q["id"], q.get("irt_discrimination", 1.0) or 1.0, q.get("irt_difficulty", 0.0) or 0.0, q.get("irt_guessing", 0.0) or 0.0)
        for q in questions
    ]
    
    try:
        next_q_id = select_next_question(available_items=available_items, current_theta=initial_theta)
    except Exception:
        next_q_id = available_items[0][0]
        
    first_q = next((q for q in questions if q["id"] == next_q_id), questions[0])
    
    session_id = str(uuid.uuid4())
    sb.table("sessions").insert({
        "id": session_id,
        "user_id": request.user_id,
        "config": {"chapter_id": request.chapter_id},
        "status": "active",
        "adaptive_mode": True
    }).execute()
    
    return {
        "session_id": session_id,
        "first_question": {
            "question_id": first_q["id"],
            "concept_id": first_q.get("concept_id", ""),
            "type": first_q["format"],
            "prompt": first_q["question_body"],
            "options": [o["text"] for o in first_q.get("options", [])] if first_q.get("options") else None,
        }
    }

@router.post("/session/answer", response_model=AnswerSubmitResponse)
def submit_answer(request: AnswerSubmitRequest):
    sb = get_supabase()
    q_res = sb.table("questions").select("*").eq("id", request.question_id).execute()
    if not q_res.data:
        raise HTTPException(status_code=404, detail="Question not found")
    q = q_res.data[0]
    
    sb.table("answer_events").insert({
        "session_id": request.session_id,
        "user_id": request.user_id,
        "question_id": request.question_id,
        "is_correct": request.is_correct,
        "time_taken_ms": request.time_taken_ms
    }).execute()
    
    events_res = sb.table("answer_events").select("question_id, is_correct").eq("session_id", request.session_id).execute()
    q_ids = [e["question_id"] for e in events_res.data]
    
    past_qs_res = sb.table("questions").select("id, irt_discrimination, irt_difficulty, irt_guessing").in_("id", q_ids).execute()
    past_qs_map = {pq["id"]: pq for pq in past_qs_res.data}
    
    responses = []
    for e in events_res.data:
        pq = past_qs_map.get(e["question_id"])
        if pq:
            responses.append((
                pq.get("irt_discrimination", 1.0) or 1.0, 
                pq.get("irt_difficulty", 0.0) or 0.0, 
                pq.get("irt_guessing", 0.0) or 0.0, 
                1 if e["is_correct"] else 0
            ))
            
    current_theta = estimate_theta(responses, 0.0)
    
    sess_res = sb.table("sessions").select("config").eq("id", request.session_id).execute()
    if not sess_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    config = sess_res.data[0]["config"]
    if isinstance(config, str):
        config = json.loads(config)
    chapter_id = config.get("chapter_id")
    
    all_qs_res = sb.table("questions").select("*").eq("chapter_id", chapter_id).execute()
    all_qs = all_qs_res.data
    
    available_qs = [aq for aq in all_qs if aq["id"] not in q_ids]
    
    next_q_dict = None
    exhausted = False
    if not available_qs:
        exhausted = True
    else:
        available_items = [
            (aq["id"], aq.get("irt_discrimination", 1.0) or 1.0, aq.get("irt_difficulty", 0.0) or 0.0, aq.get("irt_guessing", 0.0) or 0.0)
            for aq in available_qs
        ]
        try:
            next_q_id = select_next_question(available_items=available_items, current_theta=current_theta)
            next_q = next((aq for aq in available_qs if aq["id"] == next_q_id), available_qs[0])
            next_q_dict = {
                "question_id": next_q["id"],
                "concept_id": next_q.get("concept_id", ""),
                "type": next_q["format"],
                "prompt": next_q["question_body"],
                "options": [o["text"] for o in next_q.get("options", [])] if next_q.get("options") else None,
            }
        except ValueError:
            exhausted = True
            
    solution_dict = {
        "steps": [q.get("solution", "")] if q.get("solution") else ["Solution steps available soon."],
        "misconception_tag": None
    }
    
    return {
        "correct": request.is_correct,
        "solution": solution_dict,
        "next_question": next_q_dict,
        "chapter_exhausted": exhausted
    }

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
    
    all_qs_res = sb.table("questions").select("*").eq("chapter_id", chapter_id).execute()
    all_qs = all_qs_res.data
    available_qs = [aq for aq in all_qs if aq["id"] not in q_ids]
    
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
            "options": [o["text"] for o in next_q.get("options", [])] if next_q.get("options") else None,
        }
        
    return {
        "next_question": next_q_dict,
        "concept_deferred": False,
        "chapter_exhausted": exhausted
    }
