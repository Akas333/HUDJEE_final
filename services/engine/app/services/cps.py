from datetime import date
from typing import List, Dict
import random

def compute_cps_for_user(user_id: str, current_date: date, user_data: dict) -> dict:
    """
    Computes the Comprehensive Practice Score (CPS) for a given user.
    This is a mocked version of the complex calculation that will run nightly.
    """
    # In reality, this would pull historical accuracy, speed, volume, and consistency from Supabase.
    
    # Mock factors
    factor_accuracy = random.uniform(0.6, 0.95)
    factor_speed = random.uniform(0.5, 0.9)
    factor_volume = random.uniform(0.7, 1.0)
    factor_difficulty = random.uniform(0.8, 1.0)
    factor_consistency = random.uniform(0.9, 1.0)
    factor_focus = random.uniform(0.7, 0.95)
    factor_target = random.uniform(0.8, 1.0)
    
    # Calculate a composite score out of 1000
    base_score = 1000 * (
        (factor_accuracy * 0.3) +
        (factor_speed * 0.15) +
        (factor_difficulty * 0.2) +
        (factor_volume * 0.1) +
        (factor_consistency * 0.1) +
        (factor_focus * 0.1) +
        (factor_target * 0.05)
    )
    
    return {
        "user_id": user_id,
        "score": int(base_score),
        "factor_accuracy": factor_accuracy,
        "factor_speed": factor_speed,
        "factor_volume": factor_volume,
        "factor_difficulty": factor_difficulty,
        "factor_consistency": factor_consistency,
        "factor_focus": factor_focus,
        "factor_target": factor_target,
        "valid_for_date": str(current_date)
    }

def batch_compute_cps() -> List[dict]:
    """
    Orchestrates the CPS batch computation for all active users.
    """
    # 1. Fetch active users from Supabase
    # 2. Parallelize computation
    # 3. Insert computed scores back to Supabase `cps_scores` table
    # This is a stub for the nightly pg_cron job.
    return []
