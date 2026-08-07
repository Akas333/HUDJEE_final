from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import date

class AnswerEvent(BaseModel):
    user_id: str
    question_id: str
    is_correct: bool
    time_taken_ms: int
    difficulty: float
    discrimination: float
    guessing: float

class IRTEstimateRequest(BaseModel):
    user_id: str
    subject: str
    recent_events: List[AnswerEvent]

class CPSScore(BaseModel):
    user_id: str
    score: int
    factor_accuracy: float
    factor_speed: float
    factor_volume: float
    factor_difficulty: float
    factor_consistency: float
    factor_focus: float
    factor_target: float
    valid_for_date: date

class SessionStartRequest(BaseModel):
    user_id: str
    chapter_id: str
    concept_id: Optional[str] = None

class SessionStartResponse(BaseModel):
    session_id: str
    first_question: Optional[dict] = None
    exhausted: bool = False

class AnswerSubmitRequest(BaseModel):
    user_id: str
    session_id: str
    question_id: str
    is_correct: bool
    time_taken_ms: int
    seen_question_ids: List[str] = Field(default_factory=list)

class AnswerSubmitResponse(BaseModel):
    correct: bool
    solution: dict
    next_question: Optional[dict] = None
    chapter_exhausted: bool = False

class SkipRequest(BaseModel):
    user_id: str
    session_id: str
    question_id: str
    seen_question_ids: List[str] = Field(default_factory=list)

class SkipResponse(BaseModel):
    next_question: Optional[dict] = None
    concept_deferred: bool = False
    chapter_exhausted: bool = False

class ReportRequest(BaseModel):
    user_id: str
    question_id: str
    reason: str
    details: Optional[str] = None


# ── Arena ────────────────────────────────────────────────────────────────────
# One session, up to three independent engine contexts. Everything below is
# addressed per subject, because that is the unit the engine adapts on.

class ArenaSubjectSelection(BaseModel):
    subject: str
    chapter_ids: List[str] = Field(default_factory=list)
    # Modes 3 and 4 only: the per-subject question target that locks the subject.
    target_count: Optional[int] = None
    # The student may open a subject at a level of their choosing instead of the
    # one rolled up from their history.
    start_mastery_pct: Optional[float] = None


class ArenaContextState(BaseModel):
    subject: str
    theta: float
    mastery_pct: int
    starting_theta: float
    starting_mastery_pct: int
    questions_answered: int = 0
    correct_count: int = 0
    skipped_count: int = 0
    target_count: Optional[int] = None
    locked: bool = False
    questions_available: int = 0


class ArenaPreviewRequest(BaseModel):
    user_id: str
    subjects: List[ArenaSubjectSelection]


class ArenaPreviewResponse(BaseModel):
    contexts: List[ArenaContextState]


class ArenaSessionStartRequest(BaseModel):
    user_id: str
    mode: str  # open_run | time_trial | target_run | full_simulation
    subjects: List[ArenaSubjectSelection]
    active_subject: str
    duration_seconds: Optional[int] = None
    total_target: Optional[int] = None


class ArenaSessionStartResponse(BaseModel):
    session_id: str
    contexts: List[ArenaContextState]
    first_question: Optional[dict] = None
    exhausted: bool = False


class ArenaNextRequest(BaseModel):
    user_id: str
    session_id: str
    subject: str
    seen_question_ids: List[str] = Field(default_factory=list)


class ArenaNextResponse(BaseModel):
    next_question: Optional[dict] = None
    context: ArenaContextState
    exhausted: bool = False


class ArenaAnswerRequest(BaseModel):
    user_id: str
    session_id: str
    subject: str
    question_id: str
    is_correct: bool
    time_taken_ms: int
    seen_question_ids: List[str] = Field(default_factory=list)


class ArenaAnswerResponse(BaseModel):
    correct: bool
    solution: dict
    context: ArenaContextState
    mastery_delta: int = 0
    next_question: Optional[dict] = None
    exhausted: bool = False


class ArenaSkipRequest(BaseModel):
    user_id: str
    session_id: str
    subject: str
    question_id: str
    seen_question_ids: List[str] = Field(default_factory=list)


class ArenaSkipResponse(BaseModel):
    context: ArenaContextState
    mastery_delta: int = 0
    next_question: Optional[dict] = None
    exhausted: bool = False


class ArenaMissedQuestion(BaseModel):
    question_id: str
    subject: str
    concept_id: Optional[str] = None
    concept_name: Optional[str] = None
    prompt: str


class ArenaSubjectSummary(BaseModel):
    subject: str
    starting_mastery_pct: int
    ending_mastery_pct: int
    mastery_delta: int
    questions_answered: int
    correct_count: int
    skipped_count: int
    accuracy: int
    target_count: Optional[int] = None
    elapsed_ms: int = 0


class ArenaEndRequest(BaseModel):
    user_id: str
    session_id: str
    duration_seconds: Optional[int] = None
    # Per-subject clocks are kept on the client (they only ever run for the
    # active subject) and handed back here so the summary can show them.
    elapsed_ms_by_subject: Dict[str, int] = Field(default_factory=dict)
    ended_reason: Optional[str] = None  # manual | time | target


class ArenaEndResponse(BaseModel):
    session_id: str
    mode: str
    ended_reason: Optional[str] = None
    duration_seconds: int = 0
    questions_answered: int = 0
    correct_count: int = 0
    skipped_count: int = 0
    accuracy: int = 0
    subjects: List[ArenaSubjectSummary] = Field(default_factory=list)
    missed_questions: List[ArenaMissedQuestion] = Field(default_factory=list)
