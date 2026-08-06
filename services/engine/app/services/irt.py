import numpy as np
from typing import List, Tuple
from catsim.estimation import NumericalSearchEstimator
from catsim.selection import MaxInfoSelector
from catsim.initialization import FixedPointInitializer
from catsim.item_bank import ItemBank

THETA_MIN = -3.0
THETA_MAX = 3.0

# A response vector that is all correct (or all incorrect) has no finite maximum
# likelihood estimate — the likelihood climbs monotonically towards ±infinity — and
# catsim's numerical search answers by handing back half the seed it was given,
# identically for a perfect and for a zero score. At the usual seed of 0.0 that reads
# as a frozen theta: a student can answer a whole session correctly and have their
# mastery written back unmoved.
#
# For those vectors we use the textbook remedy instead — the posterior mode under a
# standard normal population prior. It is always finite, it rises with the length of
# the streak, and it weighs the difficulty of the items that were actually answered,
# so a clean run on hard questions moves theta further than one on easy questions.
#
# Like the MLE path it depends only on the responses and the item parameters, never on
# the incoming estimate. That matters: Practice re-fits the entire session on every
# answer, so an estimate that stepped off the *running* theta would compound with each
# re-fit and pin a student at the ceiling within a few questions.
DEGENERATE_PRIOR_MEAN = 0.0
DEGENERATE_PRIOR_SD = 1.0

def get_initial_theta() -> float:
    """
    Returns the default starting theta for a new user.
    """
    initializer = FixedPointInitializer(0.0)
    return float(initializer.initialize())

def _map_estimate(responses: List[Tuple[float, float, float, int]]) -> float:
    """
    Posterior mode of theta under a N(DEGENERATE_PRIOR_MEAN, DEGENERATE_PRIOR_SD)
    prior, found by a dense grid search over the usable theta range.
    """
    params = np.array([[a, b, c, u] for a, b, c, u in responses], dtype=float)
    a = params[:, 0:1]
    b = params[:, 1:2]
    c = params[:, 2:3]
    u = params[:, 3:4]

    grid = np.linspace(THETA_MIN, THETA_MAX, 1201)

    # 3PL probability of a correct response, one row per item, one column per grid point.
    p = c + (1.0 - c) / (1.0 + np.exp(-a * (grid - b)))
    p = np.clip(p, 1e-9, 1.0 - 1e-9)

    log_likelihood = (u * np.log(p) + (1.0 - u) * np.log1p(-p)).sum(axis=0)
    log_prior = -((grid - DEGENERATE_PRIOR_MEAN) ** 2) / (2.0 * DEGENERATE_PRIOR_SD ** 2)

    return float(grid[np.argmax(log_likelihood + log_prior)])

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

    if len({u for *_, u in responses}) == 1:
        # All right or all wrong — no MLE exists, so fall back to the posterior mode.
        return _map_estimate(responses)

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
