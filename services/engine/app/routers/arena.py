"""
Arena session endpoints.

The session row itself lives in `sessions` (with the mode config in `config`),
not in a table of its own, so Arena answers land in `answer_events` under a real
session and every rollup that already reads those — Home's readiness, chapter
mastery, coverage — picks Arena up for free. The per-subject engine contexts get
their own table, `arena_session_contexts`.

The PRD's Redis hot path is folded into Postgres here: the live numbers are held
on the client for the length of a question and written through to the context row
on every answer, which costs one write per answer and buys resume-after-crash
without adding a service the stack does not have yet.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Sequence, Tuple

from fastapi import APIRouter, HTTPException

from app.db.supabase import get_supabase
from app.models.schemas import (
    ArenaAnswerRequest,
    ArenaAnswerResponse,
    ArenaContextState,
    ArenaEndRequest,
    ArenaEndResponse,
    ArenaMissedQuestion,
    ArenaNextRequest,
    ArenaNextResponse,
    ArenaPreviewRequest,
    ArenaPreviewResponse,
    ArenaSessionStartRequest,
    ArenaSessionStartResponse,
    ArenaSkipRequest,
    ArenaSkipResponse,
    ArenaSubjectSelection,
    ArenaSubjectSummary,
)
from app.services import arena as engine

router = APIRouter()

MODES = ("open_run", "time_trial", "target_run", "full_simulation")


def _now() -> str:
    """
    An explicit UTC timestamp. PostgREST passes values straight through, and
    Postgres rejects the literal string form of a SQL function call as
    timestamptz input — it has to be a real timestamp.
    """
    return datetime.now(timezone.utc).isoformat()


# ── helpers ──────────────────────────────────────────────────────────────────

def _require_user(user_id: str) -> str:
    """
    Arena needs somewhere to keep three ability estimates, so unlike Practice it
    cannot run for an anonymous caller.
    """
    if not user_id or user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Arena needs a signed-in student.")
    try:
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id.")
    return user_id


def _valid_chapter_ids(chapter_ids: Sequence[str]) -> List[str]:
    out = []
    for chapter_id in chapter_ids:
        try:
            uuid.UUID(chapter_id)
        except (ValueError, TypeError):
            continue
        out.append(chapter_id)
    return out


def _normalise_subject(subject: str) -> str:
    key = (subject or "").lower()
    if key not in engine.SUBJECTS:
        raise HTTPException(status_code=400, detail=f"Unknown subject '{subject}'.")
    return key


def _topics_for(sb, chapter_ids: Sequence[str]) -> List[str]:
    if not chapter_ids:
        return []
    res = sb.table("topics").select("id").in_("chapter_id", list(chapter_ids)).execute()
    return [row["id"] for row in (res.data or [])]


def _concept_thetas(sb, user_id: str, topic_ids: Sequence[str]) -> Dict[str, float]:
    if not topic_ids:
        return {}
    res = (
        sb.table("user_concept_state")
        .select("concept_id, theta")
        .eq("user_id", user_id)
        .in_("concept_id", list(topic_ids))
        .execute()
    )
    return {row["concept_id"]: float(row.get("theta") or 0.0) for row in (res.data or [])}


def _pool(sb, subject: str, chapter_ids: Sequence[str]) -> List[dict]:
    """Every published question this context is allowed to draw from."""
    if not chapter_ids:
        return []
    res = (
        sb.table("questions")
        .select("*")
        .in_("chapter_id", list(chapter_ids))
        .eq("subject", subject)
        .eq("published", True)
        .execute()
    )
    return res.data or []


def _build_context(sb, user_id: str, selection: ArenaSubjectSelection) -> ArenaContextState:
    """
    A context as it stands *before* the session starts: the subject's own
    persisted ability rolled up over just the selected chapters, or the level the
    student dialled in themselves.
    """
    subject = _normalise_subject(selection.subject)
    chapter_ids = _valid_chapter_ids(selection.chapter_ids)

    topic_ids = _topics_for(sb, chapter_ids)
    thetas = _concept_thetas(sb, user_id, topic_ids)

    if selection.start_mastery_pct is not None:
        starting_theta = engine.mastery_to_theta(selection.start_mastery_pct)
    else:
        starting_theta = engine.rollup_starting_theta(list(thetas.values()), len(topic_ids))

    return ArenaContextState(
        subject=subject,
        theta=starting_theta,
        mastery_pct=engine.theta_to_mastery(starting_theta),
        starting_theta=starting_theta,
        starting_mastery_pct=engine.theta_to_mastery(starting_theta),
        target_count=selection.target_count,
        questions_available=len(_pool(sb, subject, chapter_ids)),
    )


def _context_row(sb, session_id: str, subject: str) -> dict:
    res = (
        sb.table("arena_session_contexts")
        .select("*")
        .eq("session_id", session_id)
        .eq("subject", subject)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail=f"No {subject} context in this session.")
    return res.data[0]


def _state_from_row(row: dict, questions_available: int = 0) -> ArenaContextState:
    theta = float(row.get("current_theta") or 0.0)
    starting_theta = float(row.get("starting_theta") or 0.0)
    return ArenaContextState(
        subject=row["subject"],
        theta=theta,
        mastery_pct=engine.theta_to_mastery(theta),
        starting_theta=starting_theta,
        starting_mastery_pct=engine.theta_to_mastery(starting_theta),
        questions_answered=row.get("questions_answered") or 0,
        correct_count=row.get("correct_count") or 0,
        skipped_count=row.get("skipped_count") or 0,
        target_count=row.get("target_count"),
        locked=row.get("locked_at") is not None,
        questions_available=questions_available,
    )


def _session_events(sb, session_id: str) -> List[dict]:
    res = (
        sb.table("answer_events")
        .select("question_id, is_correct")
        .eq("session_id", session_id)
        .execute()
    )
    return res.data or []


def _questions_by_id(sb, question_ids: Sequence[str]) -> Dict[str, dict]:
    ids = [q for q in question_ids if q]
    if not ids:
        return {}
    res = (
        sb.table("questions")
        .select("id, subject, concept_id, irt_discrimination, irt_difficulty, irt_guessing, live_b")
        .in_("id", ids)
        .execute()
    )
    return {row["id"]: row for row in (res.data or [])}


def _historically_correct(sb, user_id: str) -> set:
    """Questions the student has already got right, anywhere. Arena never repeats them."""
    res = (
        sb.table("answer_events")
        .select("question_id")
        .eq("user_id", user_id)
        .eq("is_correct", True)
        .execute()
    )
    return {row["question_id"] for row in (res.data or [])}


def _next_for_context(
    sb,
    user_id: str,
    session_id: str,
    row: dict,
    seen_question_ids: Sequence[str],
) -> Tuple[Optional[dict], int]:
    """
    The next question for one context, drawn from that context's own chapters at
    that context's own theta. Returns (question, remaining pool size).
    """
    chapter_ids = row.get("chapter_ids") or []
    pool = _pool(sb, row["subject"], chapter_ids)

    answered = {event["question_id"] for event in _session_events(sb, session_id)}
    skipped = set(row.get("skipped_question_ids") or [])
    excluded = answered | skipped | set(seen_question_ids) | _historically_correct(sb, user_id)

    candidates = [q for q in pool if q["id"] not in excluded]
    if not candidates:
        return None, 0

    return engine.pick_question(candidates, float(row.get("current_theta") or 0.0)), len(candidates)


def _apply_concept_update(
    sb,
    user_id: str,
    session_id: str,
    concept_id: Optional[str],
    is_correct: Optional[bool],
    theta_delta: Optional[float] = None,
) -> None:
    """
    Write the answer through to `user_concept_state`, so an Arena answer moves
    chapter mastery and readiness exactly as the same answer would in Practice.

    Unlike Practice's version this re-fits the concept from *that concept's*
    answers in the session rather than the whole session's — an Arena session
    spans many concepts, and pooling them would credit one concept with another's
    evidence. A skip takes the bounded penalty step instead of a re-fit.
    """
    if not concept_id:
        return

    res = (
        sb.table("user_concept_state")
        .select("*")
        .eq("user_id", user_id)
        .eq("concept_id", concept_id)
        .execute()
    )
    state = res.data[0] if res.data else {
        "theta": 0.0,
        "current_bucket": "medium",
        "streak_correct": 0,
        "streak_incorrect": 0,
    }

    concept_theta = float(state.get("theta") or 0.0)
    bucket = state.get("current_bucket") or "medium"
    streak_c = int(state.get("streak_correct") or 0)
    streak_i = int(state.get("streak_incorrect") or 0)

    if theta_delta is not None:
        # Skip: nudge down, leave the streaks and the ladder where they are.
        new_theta = engine.clamp(concept_theta + theta_delta, engine.THETA_MIN, engine.THETA_MAX)
        promoted = demoted = False
    else:
        if is_correct:
            streak_c, streak_i = streak_c + 1, 0
        else:
            streak_c, streak_i = 0, streak_i + 1

        bucket, streak_c, streak_i, promoted, demoted = engine.next_bucket(bucket, streak_c, streak_i)

        events = _session_events(sb, session_id)
        questions = _questions_by_id(sb, [e["question_id"] for e in events])
        responses = [
            (*engine.item_params(questions[e["question_id"]]), 1 if e["is_correct"] else 0)
            for e in events
            if questions.get(e["question_id"], {}).get("concept_id") == concept_id
        ]
        # Anchored on the concept's stored theta, which moves with every answer —
        # hence incremental, so a run of misses is not re-charged in full each time.
        new_theta = engine.re_estimate(concept_theta, responses, incremental=True)

        if promoted:
            new_theta = max(new_theta, engine.BUCKET_BOUNDS[bucket][0])
        elif demoted:
            new_theta = min(new_theta, engine.BUCKET_BOUNDS[bucket][1] - 0.01)

    payload = {
        "user_id": user_id,
        "concept_id": concept_id,
        "theta": new_theta,
        "current_bucket": bucket,
        "streak_correct": streak_c,
        "streak_incorrect": streak_i,
    }
    if theta_delta is None and promoted:
        payload["last_promotion_at"] = _now()
    if theta_delta is None and demoted:
        payload["last_demotion_at"] = _now()

    # Not an upsert: `user_concept_state` keys on `id`, with (user_id, concept_id)
    # as a *separate* unique constraint, so PostgREST resolves the conflict
    # against the primary key, generates a fresh id and trips the unique index
    # with a 23505 on every answer after the first for a given concept. The row
    # was already read above, so the branch is free.
    table = sb.table("user_concept_state")
    if res.data:
        payload["updated_at"] = _now()
        table.update(payload).eq("user_id", user_id).eq("concept_id", concept_id).execute()
    else:
        table.insert(payload).execute()


def _lock_if_target_met(row: dict, questions_answered: int) -> Optional[str]:
    target = row.get("target_count")
    if target and questions_answered >= target and not row.get("locked_at"):
        return _now()
    return None


# ── endpoints ────────────────────────────────────────────────────────────────

@router.post("/preview", response_model=ArenaPreviewResponse)
def preview_contexts(request: ArenaPreviewRequest):
    """
    What the student is walking into: each selected subject's current standing and
    how many questions the selection actually has behind it. Backs the setup
    screen's summary panel.
    """
    user_id = _require_user(request.user_id)
    sb = get_supabase()
    return {"contexts": [_build_context(sb, user_id, s) for s in request.subjects]}


@router.post("/session/start", response_model=ArenaSessionStartResponse)
def start_session(request: ArenaSessionStartRequest):
    user_id = _require_user(request.user_id)

    if request.mode not in MODES:
        raise HTTPException(status_code=400, detail=f"Unknown mode '{request.mode}'.")
    if not request.subjects:
        raise HTTPException(status_code=400, detail="Pick at least one subject.")

    sb = get_supabase()

    contexts = [_build_context(sb, user_id, s) for s in request.subjects]
    selections = {_normalise_subject(s.subject): s for s in request.subjects}

    if not any(_valid_chapter_ids(s.chapter_ids) for s in request.subjects):
        raise HTTPException(status_code=400, detail="Pick at least one chapter.")

    active_subject = _normalise_subject(request.active_subject)
    if active_subject not in selections:
        active_subject = contexts[0].subject

    session_id = str(uuid.uuid4())
    config = {
        "arena": True,
        "mode": request.mode,
        "duration_seconds": request.duration_seconds,
        "total_target": request.total_target,
        "subjects": {
            subject: {
                "chapter_ids": _valid_chapter_ids(selection.chapter_ids),
                "target_count": selection.target_count,
            }
            for subject, selection in selections.items()
        },
    }

    # Time-limited modes record the clock; count-limited modes record the target.
    if request.mode in ("time_trial", "full_simulation"):
        target_type, target_value = "time", int((request.duration_seconds or 0) / 60)
    elif request.mode == "target_run":
        target_type, target_value = "question_count", request.total_target
    else:
        target_type, target_value = None, None

    try:
        sb.table("sessions").insert({
            "id": session_id,
            "user_id": user_id,
            "config": config,
            "status": "active",
            "adaptive_mode": True,
            "target_type": target_type,
            "target_value": target_value,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not open the Arena session: {e}")

    rows = [
        {
            "session_id": session_id,
            "user_id": user_id,
            "subject": context.subject,
            "chapter_ids": _valid_chapter_ids(selections[context.subject].chapter_ids),
            "starting_theta": context.starting_theta,
            "current_theta": context.theta,
            "target_count": context.target_count,
        }
        for context in contexts
    ]
    sb.table("arena_session_contexts").insert(rows).execute()

    row = _context_row(sb, session_id, active_subject)
    question, remaining = _next_for_context(sb, user_id, session_id, row, [])

    return {
        "session_id": session_id,
        "contexts": contexts,
        "first_question": engine.serialize_question(question) if question else None,
        "exhausted": question is None,
    }


@router.post("/session/next", response_model=ArenaNextResponse)
def next_question(request: ArenaNextRequest):
    """
    The question a subject serves when the student switches into it. It comes from
    that subject's own queue at that subject's own theta — which is why the first
    Maths question after ten hard Physics ones is still calibrated to Maths.
    """
    user_id = _require_user(request.user_id)
    subject = _normalise_subject(request.subject)
    sb = get_supabase()

    row = _context_row(sb, request.session_id, subject)
    question, remaining = _next_for_context(sb, user_id, request.session_id, row, request.seen_question_ids)

    return {
        "next_question": engine.serialize_question(question) if question else None,
        "context": _state_from_row(row, remaining),
        "exhausted": question is None,
    }


@router.post("/session/answer", response_model=ArenaAnswerResponse)
def submit_answer(request: ArenaAnswerRequest):
    user_id = _require_user(request.user_id)
    subject = _normalise_subject(request.subject)
    sb = get_supabase()

    row = _context_row(sb, request.session_id, subject)

    q_res = sb.table("questions").select("*").eq("id", request.question_id).execute()
    if not q_res.data:
        raise HTTPException(status_code=404, detail="Question not found")
    question = q_res.data[0]

    if question.get("subject") != subject:
        raise HTTPException(status_code=400, detail="That question does not belong to this subject's context.")

    theta_before = float(row.get("current_theta") or 0.0)
    _, live_b, _ = engine.item_params(question)

    sb.table("answer_events").insert({
        "session_id": request.session_id,
        "user_id": user_id,
        "question_id": request.question_id,
        "is_correct": request.is_correct,
        "time_taken_ms": request.time_taken_ms,
        "theta_at_time": theta_before,
        "live_b_at_time": live_b,
    }).execute()

    # The concept ladder — shared with Practice, so Arena feeds the same mastery.
    _apply_concept_update(sb, user_id, request.session_id, question.get("concept_id"), request.is_correct)

    # This context's own re-fit, over this subject's answers only.
    events = _session_events(sb, request.session_id)
    questions = _questions_by_id(sb, [e["question_id"] for e in events])
    responses = engine.subject_responses(events, questions, subject)
    new_theta = engine.re_estimate(float(row.get("starting_theta") or 0.0), responses)

    answered = (row.get("questions_answered") or 0) + 1
    correct = (row.get("correct_count") or 0) + (1 if request.is_correct else 0)

    update = {
        "current_theta": new_theta,
        "questions_answered": answered,
        "correct_count": correct,
        "updated_at": _now(),
    }
    locked_at = _lock_if_target_met(row, answered)
    if locked_at:
        update["locked_at"] = locked_at

    sb.table("arena_session_contexts").update(update).eq("session_id", request.session_id).eq("subject", subject).execute()

    row = {**row, **update, "locked_at": locked_at or row.get("locked_at")}
    next_q, remaining = _next_for_context(sb, user_id, request.session_id, row, request.seen_question_ids)

    solution = {
        "steps": [question.get("solution")] if question.get("solution") else ["Solution steps available soon."],
        "misconception_tag": None,
    }

    return {
        "correct": request.is_correct,
        "solution": solution,
        "context": _state_from_row(row, remaining),
        "mastery_delta": engine.theta_to_mastery(new_theta) - engine.theta_to_mastery(theta_before),
        "next_question": engine.serialize_question(next_q) if next_q else None,
        "exhausted": next_q is None,
    }


@router.post("/session/skip", response_model=ArenaSkipResponse)
def skip_question(request: ArenaSkipRequest):
    """
    A deliberate skip. It costs the subject — and the concept behind the question
    — a small, bounded amount of mastery (see `services/arena.py` for the
    formula). Leaving a question behind by switching subjects is *not* this: that
    freezes the question and costs nothing.
    """
    user_id = _require_user(request.user_id)
    subject = _normalise_subject(request.subject)
    sb = get_supabase()

    row = _context_row(sb, request.session_id, subject)

    q_res = sb.table("questions").select("*").eq("id", request.question_id).execute()
    if not q_res.data:
        raise HTTPException(status_code=404, detail="Question not found")
    question = q_res.data[0]

    theta_before = float(row.get("current_theta") or 0.0)
    a, b, c = engine.item_params(question)
    delta = engine.skip_penalty(theta_before, a, b, c)
    new_theta = engine.clamp(theta_before + delta, engine.THETA_MIN, engine.THETA_MAX)

    _apply_concept_update(
        sb, user_id, request.session_id, question.get("concept_id"), None, theta_delta=delta
    )

    # Skipped items are remembered on the context so the same question does not
    # come straight back around; they are not answers, so no `answer_event`.
    skipped_ids = list(row.get("skipped_question_ids") or [])
    if request.question_id not in skipped_ids:
        skipped_ids.append(request.question_id)

    update = {
        "current_theta": new_theta,
        "skipped_count": (row.get("skipped_count") or 0) + 1,
        "skipped_question_ids": skipped_ids,
        "updated_at": _now(),
    }
    sb.table("arena_session_contexts").update(update).eq("session_id", request.session_id).eq("subject", subject).execute()

    row = {**row, **update}
    next_q, remaining = _next_for_context(sb, user_id, request.session_id, row, request.seen_question_ids)

    return {
        "context": _state_from_row(row, remaining),
        "mastery_delta": engine.theta_to_mastery(new_theta) - engine.theta_to_mastery(theta_before),
        "next_question": engine.serialize_question(next_q) if next_q else None,
        "exhausted": next_q is None,
    }


@router.post("/session/end", response_model=ArenaEndResponse)
def end_session(request: ArenaEndRequest):
    user_id = _require_user(request.user_id)
    sb = get_supabase()

    sess_res = sb.table("sessions").select("*").eq("id", request.session_id).eq("user_id", user_id).execute()
    if not sess_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sess_res.data[0]

    config = session.get("config") or {}
    if isinstance(config, str):
        config = json.loads(config)

    ctx_res = (
        sb.table("arena_session_contexts").select("*").eq("session_id", request.session_id).execute()
    )
    rows = ctx_res.data or []

    subjects: List[ArenaSubjectSummary] = []
    answered = correct = skipped = 0

    for row in rows:
        subject = row["subject"]
        elapsed = int(request.elapsed_ms_by_subject.get(subject, 0))
        row_answered = row.get("questions_answered") or 0
        row_correct = row.get("correct_count") or 0
        row_skipped = row.get("skipped_count") or 0

        answered += row_answered
        correct += row_correct
        skipped += row_skipped

        starting_theta = float(row.get("starting_theta") or 0.0)
        ending_theta = float(row.get("current_theta") or 0.0)
        start_pct = engine.theta_to_mastery(starting_theta)
        end_pct = engine.theta_to_mastery(ending_theta)

        sb.table("arena_session_contexts").update({
            "ending_theta": ending_theta,
            "elapsed_ms": elapsed,
            "updated_at": _now(),
        }).eq("session_id", request.session_id).eq("subject", subject).execute()

        subjects.append(ArenaSubjectSummary(
            subject=subject,
            starting_mastery_pct=start_pct,
            ending_mastery_pct=end_pct,
            mastery_delta=end_pct - start_pct,
            questions_answered=row_answered,
            correct_count=row_correct,
            skipped_count=row_skipped,
            accuracy=int(round((row_correct / row_answered) * 100)) if row_answered else 0,
            target_count=row.get("target_count"),
            elapsed_ms=elapsed,
        ))

    duration = int(request.duration_seconds or 0)
    target_value = session.get("target_value") or 0
    completion = "incomplete"
    if session.get("target_type") == "question_count" and target_value:
        completion = "on_target" if answered >= target_value else "incomplete"
    elif session.get("target_type") == "time":
        completion = "on_target" if request.ended_reason == "time" else "incomplete"
    elif answered > 0:
        completion = "on_target"

    sb.table("sessions").update({
        "status": "completed",
        "ended_at": _now(),
        "questions_answered": answered,
        "correct_count": correct,
        "duration_seconds": duration,
        "completion_tag": completion,
    }).eq("id", request.session_id).execute()

    missed = _missed_questions(sb, request.session_id)

    return {
        "session_id": request.session_id,
        "mode": config.get("mode", "open_run"),
        "ended_reason": request.ended_reason,
        "duration_seconds": duration,
        "questions_answered": answered,
        "correct_count": correct,
        "skipped_count": skipped,
        "accuracy": int(round((correct / answered) * 100)) if answered else 0,
        "subjects": subjects,
        "missed_questions": missed,
    }


def _missed_questions(sb, session_id: str) -> List[ArenaMissedQuestion]:
    """The wrong answers, for the summary's review list."""
    res = (
        sb.table("answer_events")
        .select("question_id")
        .eq("session_id", session_id)
        .eq("is_correct", False)
        .execute()
    )
    ids = [row["question_id"] for row in (res.data or [])]
    if not ids:
        return []

    q_res = (
        sb.table("questions")
        .select("id, subject, concept_id, question_body")
        .in_("id", ids)
        .execute()
    )
    questions = q_res.data or []

    concept_ids = [q["concept_id"] for q in questions if q.get("concept_id")]
    names: Dict[str, str] = {}
    if concept_ids:
        t_res = sb.table("topics").select("id, name").in_("id", concept_ids).execute()
        names = {row["id"]: row["name"] for row in (t_res.data or [])}

    return [
        ArenaMissedQuestion(
            question_id=q["id"],
            subject=q.get("subject", ""),
            concept_id=q.get("concept_id"),
            concept_name=names.get(q.get("concept_id")),
            prompt=(q.get("question_body") or "")[:280],
        )
        for q in questions
    ]
