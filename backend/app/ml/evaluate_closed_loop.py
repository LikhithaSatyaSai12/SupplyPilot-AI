import sys
from pathlib import Path
from typing import Dict, Any, List

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal
from app.models import ExecutionOutcome
from app.services.classification_service import classify_outcome


def format_currency(value: float) -> str:
    sign = "-" if value < 0 else ""
    return f"{sign}${abs(value):,.2f}"


def evaluate_closed_loop(session=None) -> Dict[str, Any]:
    """
    Evaluate historical executed decisions by comparing expected/predicted outcomes
    against actual execution outcomes stored in the database.
    """
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True

    try:
        outcomes: List[ExecutionOutcome] = session.query(ExecutionOutcome).all()
    except Exception as e:
        print(f"Error querying execution outcomes: {e}")
        outcomes = []
    finally:
        if close_session:
            session.close()

    total_evaluated = len(outcomes)

    if total_evaluated == 0:
        print("==========================================")
        print("CLOSED-LOOP BATCH EVALUATION")
        print("==========================================")
        print()
        print("No execution outcomes available for evaluation.")
        print()
        print("==========================================")
        print("EVALUATION COMPLETE")
        print("==========================================")
        return {
            "total_outcomes": 0,
            "total_expected_cost": 0.0,
            "total_actual_cost": 0.0,
            "total_cost_variance": 0.0,
            "average_cost_variance": 0.0,
            "average_delivery_variance": 0.0,
            "variance_count": 0,
            "favorable_count": 0,
            "on_target_count": 0,
            "variance_rate": 0.0,
            "cost_accuracy": 0.0,
            "status": "EMPTY",
        }

    total_expected_cost = 0.0
    total_actual_cost = 0.0
    total_cost_variance = 0.0
    total_delivery_variance = 0.0

    variance_count = 0
    favorable_count = 0
    on_target_count = 0

    for item in outcomes:
        exp_c = float(item.expected_cost or 0.0)
        act_c = float(item.actual_cost or 0.0)
        c_var = float(item.cost_variance if item.cost_variance is not None else (act_c - exp_c))

        exp_d = float(item.expected_days or 0.0)
        act_d = float(item.actual_days or 0.0)
        d_var = float(item.delivery_variance if item.delivery_variance is not None else (act_d - exp_d))

        total_expected_cost += exp_c
        total_actual_cost += act_c
        total_cost_variance += c_var
        total_delivery_variance += d_var

        # Use stored status or classify using classification service
        status = str(item.outcome_status or "").strip().upper()
        if not status:
            classified = classify_outcome(
                expected_cost=exp_c,
                actual_cost=act_c,
                expected_days=int(exp_d),
                actual_days=int(act_d),
                expected_risk=str(item.expected_risk or "Medium"),
                actual_risk=str(item.actual_risk or item.expected_risk or "Medium"),
            )
            status = classified["outcome_status"]

        if status == "VARIANCE_DETECTED":
            variance_count += 1
        elif status == "FAVORABLE":
            favorable_count += 1
        elif status == "ON_TARGET":
            on_target_count += 1
        else:
            if c_var > 1.0 or d_var > 0.5:
                variance_count += 1
            elif c_var < -1.0 or d_var < -0.5:
                favorable_count += 1
            else:
                on_target_count += 1

    avg_cost_variance = total_cost_variance / total_evaluated
    avg_delivery_variance = total_delivery_variance / total_evaluated
    variance_rate = (variance_count / total_evaluated) * 100.0

    cost_accuracy = (
        max(0.0, 100.0 - (abs(total_cost_variance) / total_expected_cost) * 100.0)
        if total_expected_cost > 0
        else 0.0
    )

    print("==========================================")
    print("CLOSED-LOOP BATCH EVALUATION")
    print("==========================================")
    print()
    print(f"Total outcomes evaluated: {total_evaluated}")
    print()
    print(f"Expected Cost: {format_currency(total_expected_cost)}")
    print(f"Actual Cost: {format_currency(total_actual_cost)}")
    print(f"Total Cost Variance: {format_currency(total_cost_variance)}")
    print(f"Average Cost Variance: {format_currency(avg_cost_variance)}")
    print()
    print(f"Average Delivery Variance: {avg_delivery_variance:+.1f} days")
    print()
    print(f"Variance Detected: {variance_count}")
    print(f"Favorable Outcomes: {favorable_count}")
    print(f"On Target Outcomes: {on_target_count}")
    print()
    print(f"Variance Rate: {variance_rate:.1f}%")
    print(f"Cost Accuracy: {cost_accuracy:.1f}%")
    print()
    print("==========================================")
    print("EVALUATION COMPLETE")
    print("==========================================")

    return {
        "total_outcomes": total_evaluated,
        "total_expected_cost": round(total_expected_cost, 2),
        "total_actual_cost": round(total_actual_cost, 2),
        "total_cost_variance": round(total_cost_variance, 2),
        "average_cost_variance": round(avg_cost_variance, 2),
        "average_delivery_variance": round(avg_delivery_variance, 1),
        "variance_count": variance_count,
        "favorable_count": favorable_count,
        "on_target_count": on_target_count,
        "variance_rate": round(variance_rate, 1),
        "cost_accuracy": round(cost_accuracy, 1),
        "status": "SUCCESS",
    }


if __name__ == "__main__":
    evaluate_closed_loop()
