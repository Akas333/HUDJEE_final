import numpy as np
from typing import List, Tuple
from catsim.estimation import NumericalSearchEstimator
from catsim.selection import MaxInfoSelector
from catsim.initialization import FixedPointInitializer
from catsim.item_bank import ItemBank

def get_initial_theta() -> float:
    """
    Returns the default starting theta for a new user.
    """
    initializer = FixedPointInitializer(0.0)
    return float(initializer.initialize())

def estimate_theta(
    responses: List[Tuple[float, float, float, int]], 
    initial_theta: float = 0.0,
) -> float:
    """
    Estimates user ability (theta) using catsim's NumericalSearchEstimator.
    
    responses: List of tuples (a, b, c, u) where:
        a = item discrimination
        b = item difficulty
        c = guessing parameter (pseudo-guessing)
        u = user response (1 for correct, 0 for incorrect)
    """
    if not responses:
        return initial_theta
        
    # catsim expects items as a numpy array of shape (N, 4)
    # columns: [discrimination, difficulty, pseudo-guessing, upper_asymptote]
    items = []
    administered_responses = []
    
    for a, b, c, u in responses:
        items.append([a, b, c, 1.0])
        administered_responses.append(bool(u))
        
    items_np = np.array(items)
    responses_np = np.array(administered_responses)
    
    bank = ItemBank(items_np)
    
    estimator = NumericalSearchEstimator()
    new_theta = estimator.estimate(
        item_bank=bank,
        administered_items=list(range(len(items))),
        response_vector=responses_np,
        est_theta=initial_theta
    )
    
    return float(new_theta)

def select_next_question(
    available_items: List[Tuple[int, float, float, float]], # list of (id, a, b, c)
    current_theta: float,
) -> int:
    """
    Selects the best next question using MaxInfoSelector (Maximum Fisher Information).
    
    available_items: List of tuples (id, a, b, c) for questions the user hasn't answered yet.
    Returns: The ID of the selected question.
    """
    if not available_items:
        raise ValueError("No available items to select from.")
        
    items = []
    for q_id, a, b, c in available_items:
        items.append([a, b, c, 1.0])
        
    items_np = np.array(items)
    bank = ItemBank(items_np)
    
    selector = MaxInfoSelector()
    
    # administered_items is empty because we're passing only the available items to select from.
    # catsim will pick an index from the items_np matrix.
    item_index = selector.select(
        item_bank=bank,
        administered_items=[],
        est_theta=current_theta
    )
    
    # Map back to the question ID
    return available_items[item_index][0]
