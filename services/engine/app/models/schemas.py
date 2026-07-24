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
