"""
Arena's multi-context adaptive engine.

An Arena session is cross-chapter *and* cross-subject, which introduces a failure
mode Practice never had: if one ability estimate were shared across subjects, a
run of hard Physics questions would hand the student a hard Maths question next,
even though they have demonstrated nothing about Maths in that session.

So a session runs one independent engine context per active subject (at most
three). Each context:

  * starts from that subject's own persisted ability, rolled up over just the
    chapters the student selected under it (`rollup_starting_theta`);
  * only ever sees answers given in that subject — `subject_responses` filters
    the session's answer history down by the question's subject, which is what
    structurally guarantees the isolation rather than merely arranging for it;
  * freezes exactly where it was left when the student switches away, because
    nothing outside that filter can move it.

Every answer still writes through to `user_concept_state`, so Arena practice
feeds the same mastery / coverage / readiness numbers Practice does.
"""

import math
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from app.services.irt import estimate_theta, select_next_question

SUBJECTS = ("physics", "chemistry", "maths")

THETA_MIN = -3.0
THETA_MAX = 3.0

# Difficulty buckets, shared with the per-concept ladder in the IRT router.
BUCKETS = ["easy", "slightly_easy", "medium", "slightly_medium", "slightly_hard", "hard"]
BUCKET_BOUNDS = {
    "easy": (-3.0, -2.0),
    "slightly_easy": (-2.0, -1.0),
    "medium": (-1.0, 0.0),
    "slightly_medium": (0.0, 1.0),
    "slightly_hard": (1.0, 2.0),
    "hard": (2.0, 3.0),
}

PROMOTE_STREAK = 5
DEMOTE_STREAK = 2

# ── Skip penalty ─────────────────────────────────────────────────────────────
# A skip is weak negative evidence: the student did not get it wrong, but they
# also did not attempt something the engine believed was within reach. It is
# scored as a fractional-credit incorrect response, using the same score-function
# step an incorrect answer would take (Δθ ∝ −a·P(correct)), so skipping an item
# you were expected to solve costs more than skipping one you probably would have
# missed anyway.
#
#     Δθ_skip = −SKIP_STEP · SKIP_WEIGHT · a · P(correct | θ, a, b, c)
#
# clamped to SKIP_MAX_DROP so a run of skips erodes mastery slightly rather than
# wiping out a session's worth of real answers.
SKIP_WEIGHT = 0.25
SKIP_STEP = 0.35
SKIP_MAX_DROP = 0.15

# A perfect (or perfectly wrong) response vector has no finite maximum-likelihood
# estimate, and catsim's estimator answers by handing the anchor straight back —
# so a student answering ten in a row correctly would watch their readout sit
# still, which is exactly the run Arena is built to show moving. For those runs
# the estimate steps off the anchor by a fixed amount per response instead,
# capped so an unbeaten streak cannot run away from the evidence.
DEGENERATE_STEP = 0.30
DEGENERATE_CAP = 1.75

# Weight given to the cold-start prior for each selected chapter's topics the
# student has never touched. Below 1 so one scored topic still moves the start,
# above 0 so a mostly-unstudied subject opens near the default rather than being
# pinned to whichever single topic happens to have a score.
COLD_START_WEIGHT = 0.5
COLD_START_THETA = 0.0


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def theta_to_mastery(theta: float) -> int:
    """
    IRT theta lives roughly in [-3, 3]; map it onto the same 0–100 mastery scale
    the mobile app already shows for chapters and topics, so the number on an
    Arena subject pill means the same thing as the number on a chapter card.
    """
    return int(round(clamp((theta + 3.0) / 6.0, 0.0, 1.0) * 100))


def mastery_to_theta(mastery_pct: float) -> float:
    """Inverse of `theta_to_mastery`, for a student-chosen starting level."""
    return clamp((clamp(mastery_pct, 0.0, 100.0) / 100.0) * 6.0 - 3.0, THETA_MIN, THETA_MAX)


def p_correct(theta: float, a: float, b: float, c: float) -> float:
    """3PL probability of a correct response."""
    try:
        logistic = 1.0 / (1.0 + math.exp(-a * (theta - b)))
    except OverflowError:
        logistic = 0.0 if theta < b else 1.0
    return c + (1.0 - c) * logistic


def skip_penalty(theta: float, a: float, b: float, c: float) -> float:
    """The (negative) theta delta a skipped item costs. See the note above."""
    raw = SKIP_STEP * SKIP_WEIGHT * max(a, 0.1) * p_correct(theta, a, b, c)
    return -min(raw, SKIP_MAX_DROP)


def item_params(question: dict) -> Tuple[float, float, float]:
    """(a, b, c) for a question row, with the same fallbacks the IRT router uses."""
    a = question.get("irt_discrimination") or 1.0
    b = question.get("live_b")
    if b is None:
        b = question.get("irt_difficulty")
    if b is None:
        b = 0.0
    c = question.get("irt_guessing") or 0.0
    return float(a), float(b), float(c)


def rollup_starting_theta(scored_thetas: Sequence[float], topic_count: int) -> float:
    """
    A subject context's opening ability: the mean of the student's persisted
    thetas across the topics of the selected chapters, with every untouched topic
    pulling toward the cold-start default at `COLD_START_WEIGHT`.

    Not a fresh reset, and never borrowed from another subject.
    """
    scored = list(scored_thetas)
    unscored = max(0, topic_count - len(scored))

    weight = len(scored) + COLD_START_WEIGHT * unscored
    if weight <= 0:
        return COLD_START_THETA

    total = sum(scored) + COLD_START_WEIGHT * unscored * COLD_START_THETA
    return clamp(total / weight, THETA_MIN, THETA_MAX)


def subject_responses(
    events: Iterable[dict],
    questions_by_id: Dict[str, dict],
    subject: str,
) -> List[Tuple[float, float, float, int]]:
    """
    The (a, b, c, u) tuples for one subject's answers in this session.

    This filter is the isolation guarantee: a context re-estimating its theta
    literally cannot see another subject's responses, so no amount of Physics
    can move Maths.
    """
    out: List[Tuple[float, float, float, int]] = []
    for event in events:
        question = questions_by_id.get(event.get("question_id"))
        if not question or question.get("subject") != subject:
            continue
        a, b, c = item_params(question)
        out.append((a, b, c, 1 if event.get("is_correct") else 0))
    return out


def re_estimate(
    starting_theta: float,
    responses: Sequence[Tuple[float, float, float, int]],
    incremental: bool = False,
) -> float:
    """
    Re-fit one context's theta from its own responses, anchored on the ability it
    walked into the session with.

    `incremental` is for callers anchored on a *moving* value — the concept ladder
    re-reads whatever it stored last time — where charging the whole run's
    degenerate step again on every answer would compound it: three wrong answers
    costing 0.9, then 0.9 again from the new anchor, then 0.9 again. Those callers
    run exactly once per answer, so a single step per call accumulates to the same
    place without the multiplication. A context anchored on an immutable
    `starting_theta` re-fits from scratch each time and wants the full step.
    """
    if not responses:
        return clamp(starting_theta, THETA_MIN, THETA_MAX)

    scores = {u for *_, u in responses}
    if len(scores) == 1:
        # All right or all wrong — no MLE exists. Step off the anchor instead.
        direction = 1.0 if scores == {1} else -1.0
        step = (
            DEGENERATE_STEP
            if incremental
            else min(DEGENERATE_STEP * len(responses), DEGENERATE_CAP)
        )
        return clamp(starting_theta + direction * step, THETA_MIN, THETA_MAX)

    try:
        return clamp(estimate_theta(list(responses), starting_theta), THETA_MIN, THETA_MAX)
    except Exception:
        # A failed fit must not cost the student their answer; hold the estimate.
        return clamp(starting_theta, THETA_MIN, THETA_MAX)


def pick_question(candidates: Sequence[dict], theta: float) -> Optional[dict]:
    """
    Maximum-information pick at this context's own theta. Arena pools chapters
    within a subject, so unlike Practice there is no per-concept bucket ladder to
    filter by first — the theta is the whole selector.
    """
    if not candidates:
        return None

    available = [(q["id"], *item_params(q)) for q in candidates]
    try:
        chosen_id = select_next_question(available_items=available, current_theta=theta)
    except Exception:
        # Fall back to the item whose difficulty sits closest to the estimate.
        chosen_id = min(candidates, key=lambda q: abs(item_params(q)[1] - theta))["id"]

    return next((q for q in candidates if q["id"] == chosen_id), candidates[0])


def serialize_question(question: dict) -> dict:
    """The shape the mobile app expects, matching `/irt/session/*`."""
    options = question.get("options")
    if options and not isinstance(options, dict):
        options = [o["text"] if isinstance(o, dict) else o for o in options]

    return {
        "question_id": question["id"],
        "concept_id": question.get("concept_id", ""),
        "subject": question.get("subject", ""),
        "chapter_id": question.get("chapter_id", ""),
        "type": question.get("format", "mcq_single"),
        "prompt": question.get("question_body", ""),
        "options": options,
    }


def next_bucket(current_bucket: str, streak_correct: int, streak_incorrect: int) -> Tuple[str, int, int, bool, bool]:
    """
    The per-concept difficulty ladder, unchanged from Practice: five in a row
    promotes, two misses demote. Arena rides the same ladder so a concept drilled
    here and a concept drilled there stay on one scale.
    """
    bucket = current_bucket if current_bucket in BUCKETS else "medium"
    promoted = demoted = False

    if streak_correct >= PROMOTE_STREAK:
        index = BUCKETS.index(bucket)
        if index < len(BUCKETS) - 1:
            bucket = BUCKETS[index + 1]
            promoted = True
        streak_correct = 0
    elif streak_incorrect >= DEMOTE_STREAK:
        index = BUCKETS.index(bucket)
        if index > 0:
            bucket = BUCKETS[index - 1]
            demoted = True
        streak_incorrect = 0

    return bucket, streak_correct, streak_incorrect, promoted, demoted
