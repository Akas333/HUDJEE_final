from pydantic import BaseModel, Field
from typing import List, Optional
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
