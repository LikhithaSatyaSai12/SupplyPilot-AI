"""
Classification service for evaluating execution outcome variances,
risk ordering, and deterministic business status categories.
"""

# Risk level hierarchy (Low = 1 < Medium = 2 < High = 3)
RISK_LEVELS = {
    "low": 1,
    "medium": 2,
    "high": 3,
}

# Configurable materiality tolerances
COST_TOLERANCE_USD = 1.00        # Floating point rounding tolerance ($1.00)
DELIVERY_TOLERANCE_DAYS = 0.5    # Delivery tolerance (0.5 days)


def get_risk_rank(risk_str: str) -> int:
    """Return numeric rank for risk level (1 for Low, 2 for Medium, 3 for High)."""
    return RISK_LEVELS.get(str(risk_str).strip().lower(), 2)


def compare_risk(expected_risk: str, actual_risk: str) -> int:
    """
    Compare actual risk vs expected risk using business ordering.

    Returns:
        +1: Actual risk is WORSE (e.g. Low -> Medium/High)
        -1: Actual risk is BETTER/FAVORABLE (e.g. High -> Low/Medium)
         0: Risk is UNCHANGED
    """
    exp_rank = get_risk_rank(expected_risk)
    act_rank = get_risk_rank(actual_risk)

    if act_rank > exp_rank:
        return 1  # Deterioration / Worse
    elif act_rank < exp_rank:
        return -1  # Improvement / Favorable
    return 0


def classify_outcome(
    expected_cost: float,
    actual_cost: float,
    expected_days: int,
    actual_days: int,
    expected_risk: str,
    actual_risk: str,
) -> dict:
    """
    Deterministically classify an execution outcome across all three dimensions:
    - cost (actual - expected)
    - delivery (actual - expected)
    - risk (Low < Medium < High)

    Rule Hierarchy:
    1. If ANY dimension is WORSE (cost overrun > $1.00, delivery overrun > 0.5d, or risk deterioration):
       -> "VARIANCE_DETECTED"
    2. Else if NO dimension is WORSE and AT LEAST ONE dimension is BETTER (cost savings > $1.00, faster delivery > 0.5d, or risk improvement):
       -> "FAVORABLE"
    3. Else (all dimensions match within tolerance):
       -> "ON_TARGET"

    Returns:
        dict: {
            "cost_variance": float,
            "delivery_variance": int,
            "cost_status": str ("WORSE" | "BETTER" | "MATCHED"),
            "delivery_status": str ("WORSE" | "BETTER" | "MATCHED"),
            "risk_status": str ("WORSE" | "BETTER" | "MATCHED"),
            "outcome_status": str ("FAVORABLE" | "VARIANCE_DETECTED" | "ON_TARGET")
        }
    """
    cost_variance = round(actual_cost - expected_cost, 2)
    delivery_variance = int(actual_days - expected_days)

    # 1. Cost dimension evaluation
    if cost_variance > COST_TOLERANCE_USD:
        cost_status = "WORSE"
    elif cost_variance < -COST_TOLERANCE_USD:
        cost_status = "BETTER"
    else:
        cost_status = "MATCHED"

    # 2. Delivery dimension evaluation
    if delivery_variance > DELIVERY_TOLERANCE_DAYS:
        delivery_status = "WORSE"
    elif delivery_variance < -DELIVERY_TOLERANCE_DAYS:
        delivery_status = "BETTER"
    else:
        delivery_status = "MATCHED"

    # 3. Risk dimension evaluation
    risk_cmp = compare_risk(expected_risk, actual_risk)
    if risk_cmp > 0:
        risk_status = "WORSE"
    elif risk_cmp < 0:
        risk_status = "BETTER"
    else:
        risk_status = "MATCHED"

    # 4. Aggregated classification status
    statuses = [cost_status, delivery_status, risk_status]

    if "WORSE" in statuses:
        outcome_status = "VARIANCE_DETECTED"
    elif "BETTER" in statuses:
        outcome_status = "FAVORABLE"
    else:
        outcome_status = "ON_TARGET"

    return {
        "cost_variance": cost_variance,
        "delivery_variance": delivery_variance,
        "cost_status": cost_status,
        "delivery_status": delivery_status,
        "risk_status": risk_status,
        "outcome_status": outcome_status,
    }
