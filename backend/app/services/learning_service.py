from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models import ExecutionOutcome


def get_historical_option_performance(db: Session) -> Dict[str, Dict[str, Any]]:
    """
    Retrieve historical execution statistics per option (action_id).

    Calculates:
    - Number of historical execution observations (count)
    - Average cost variance (actual_cost - expected_cost)
    - Average delivery variance (actual_days - expected_days)
    - Learning confidence weight based on observation count

    Returns:
        dict: {
            "A": {
                "count": int,
                "avg_cost_variance": float,
                "avg_delivery_variance": float,
                "confidence": float (0.0 to 1.0)
            },
            "B": ...,
            "C": ...
        }
    """
    if db is None:
        return {}

    try:
        outcomes = db.query(ExecutionOutcome).all()
    except Exception as e:
        print(f"Warning: Could not fetch execution outcomes: {e}")
        return {}

    if not outcomes:
        return {}

    stats_by_action: Dict[str, Dict[str, list]] = {}

    for outcome in outcomes:
        # Normalize action key to option ID ("A", "B", "C")
        key = None
        if outcome.action_id and str(outcome.action_id).strip().upper() in ["A", "B", "C"]:
            key = str(outcome.action_id).strip().upper()
        elif outcome.action:
            action_name = str(outcome.action).lower()
            if "air" in action_name or "freight" in action_name:
                key = "A"
            elif "secondary" in action_name or "supplier" in action_name:
                key = "B"
            elif "delay" in action_name or "launch" in action_name:
                key = "C"

        if not key:
            continue

        if key not in stats_by_action:
            stats_by_action[key] = {
                "cost_variances": [],
                "delivery_variances": []
            }

        stats_by_action[key]["cost_variances"].append(float(outcome.cost_variance))
        stats_by_action[key]["delivery_variances"].append(float(outcome.delivery_variance))

    results = {}
    for key, data in stats_by_action.items():
        count = len(data["cost_variances"])
        if count == 0:
            continue

        avg_cost_var = sum(data["cost_variances"]) / count
        avg_deliv_var = sum(data["delivery_variances"]) / count

        # Confidence weighting schedule:
        # 0 executions: 0.0 (no historical adjustment)
        # 1 execution:  0.50 (50% learning adjustment)
        # 2 executions: 0.75 (75% learning adjustment)
        # 3+ executions: 1.00 (100% learning adjustment)
        if count == 1:
            confidence = 0.50
        elif count == 2:
            confidence = 0.75
        else:
            confidence = 1.00

        results[key] = {
            "count": count,
            "avg_cost_variance": round(avg_cost_var, 2),
            "avg_delivery_variance": round(avg_deliv_var, 1),
            "confidence": confidence,
        }

    return results
