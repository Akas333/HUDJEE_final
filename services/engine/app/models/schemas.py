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

class SessionStartResponse(BaseModel):
    session_id: str
    first_question: dict

class AnswerSubmitRequest(BaseModel):
    user_id: str
    session_id: str
    question_id: str
    is_correct: bool
    time_taken_ms: int

class AnswerSubmitResponse(BaseModel):
    correct: bool
    solution: dict
    next_question: Optional[dict] = None
    chapter_exhausted: bool = False

class SkipRequest(BaseModel):
    user_id: str
    session_id: str
    question_id: str

class SkipResponse(BaseModel):
    next_question: Optional[dict] = None
    concept_deferred: bool = False
    chapter_exhausted: bool = False
