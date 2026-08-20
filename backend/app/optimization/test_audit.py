import random
import sys
from pathlib import Path

# Add backend directory to sys.path if not present
BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.prescription_engine import generate_prescriptions


def run_budget_audit(num_scenarios: int = 1000, seed: int = 42) -> dict:
    """
    Run automated optimization audit over randomized synthetic supply chain scenarios.
    Verifies that neither SciPy nor PuLP ever recommends an action violating hard budget constraints.
    """
    random.seed(seed)

    total_scenarios = 0
    total_feasible_checked = 0
    total_optimal_checked = 0
    budget_violations = 0
    failing_scenarios = []

    suppliers = ["Supplier 1", "Supplier 2", "Supplier 3", "Supplier 4", "Supplier 5"]
    risks = ["Low", "Medium", "High"]

    for i in range(num_scenarios):
        total_scenarios += 1

        # Parameter generation with diverse bounds (including extreme boundary cases)
        quantity = random.choice([
            random.randint(1, 100),
            random.randint(100, 1000),
            random.randint(1000, 10000),
            random.randint(10000, 70000),  # Extreme capacity stress test
        ])
        predicted_delay = round(random.uniform(0.5, 45.0), 1)
        unit_price = round(random.uniform(5.0, 500.0), 2)
        shipping_cost = round(random.uniform(1.0, 50.0), 2)

        # Budget range: from tight ($500) to generous ($50,000)
        max_budget = round(random.choice([
            random.uniform(200.0, 2000.0),    # Ultra-tight budget
            random.uniform(2000.0, 10000.0),  # Medium budget
            random.uniform(10000.0, 30000.0), # High budget
            20000.0,                          # Standard baseline budget
        ]), 2)

        max_time_days = round(random.uniform(2.0, 60.0), 1)
        supplier_capacity = float(random.randint(100, 20000))
        stock_level = float(random.randint(0, 300))
        min_inventory = float(random.randint(0, 100))
        risk = random.choice(risks)
        supplier = random.choice(suppliers)

        # Generate realistic randomized historical stats (simulating closed-loop learnings)
        has_history = random.random() > 0.3
        historical_stats = {}
        if has_history:
            for opt_id in ["A", "B", "C"]:
                if random.random() > 0.4:
                    count = random.randint(1, 15)
                    avg_cost_var = round(random.uniform(-2000.0, 6000.0), 2)
                    avg_deliv_var = round(random.uniform(-3.0, 8.0), 1)
                    confidence = 0.5 if count == 1 else (0.75 if count == 2 else 1.0)
                    historical_stats[opt_id] = {
                        "count": count,
                        "avg_cost_variance": avg_cost_var,
                        "avg_delivery_variance": avg_deliv_var,
                        "confidence": confidence,
                    }

        # Test both SciPy and PuLP solvers
        for solver_type in ["scipy", "pulp"]:
            prescriptions = generate_prescriptions(
                supplier=supplier,
                quantity=quantity,
                risk=risk,
                predicted_delay_days=predicted_delay,
                unit_price=unit_price,
                shipping_cost=shipping_cost,
                historical_stats=historical_stats,
                max_budget=max_budget,
                max_time_days=max_time_days,
                supplier_capacity=supplier_capacity,
                stock_level=stock_level,
                min_inventory=min_inventory,
                solver=solver_type,
            )

            # Audit constraint 1: Every option flagged feasible MUST satisfy cost <= max_budget
            for option in prescriptions:
                if option["feasible"]:
                    total_feasible_checked += 1
                    if option["cost"] > max_budget:
                        budget_violations += 1
                        failing_scenarios.append({
                            "scenario_id": i + 1,
                            "solver": solver_type,
                            "reason": "Option marked feasible despite exceeding max_budget",
                            "option_id": option["id"],
                            "cost": option["cost"],
                            "max_budget": max_budget,
                        })

                # Audit constraint 2: If an option is marked optimal, it MUST satisfy cost <= max_budget
                if option["optimal"]:
                    total_optimal_checked += 1
                    if option["cost"] > max_budget or not option["feasible"]:
                        budget_violations += 1
                        failing_scenarios.append({
                            "scenario_id": i + 1,
                            "solver": solver_type,
                            "reason": "Optimal recommendation violates hard budget constraint or feasibility",
                            "option_id": option["id"],
                            "cost": option["cost"],
                            "max_budget": max_budget,
                            "feasible": option["feasible"],
                        })

    # Summary report
    print("=" * 42)
    print("OPTIMIZATION BUDGET AUDIT")
    print("=" * 42)
    print(f"Scenarios tested: {total_scenarios}")
    print(f"Feasible options checked: {total_feasible_checked}")
    print(f"Optimal selections checked: {total_optimal_checked}")
    print(f"Budget violations: {budget_violations}")
    print(f"RESULT: {'PASS' if budget_violations == 0 else 'FAIL'}")
    print("=" * 42)

    if budget_violations > 0:
        print(f"\nAUDIT FAILED: {len(failing_scenarios)} violation(s) detected!")
        for failure in failing_scenarios[:5]:
            print(failure)
        raise AssertionError(f"Optimization Budget Audit Failed: {budget_violations} violations found.")

    return {
        "scenarios_tested": total_scenarios,
        "feasible_options_checked": total_feasible_checked,
        "optimal_selections_checked": total_optimal_checked,
        "budget_violations": budget_violations,
        "status": "PASS",
    }


def test_optimization_budget_audit():
    """Pytest test case entrypoint."""
    results = run_budget_audit(num_scenarios=1000, seed=42)
    assert results["budget_violations"] == 0
    assert results["status"] == "PASS"


if __name__ == "__main__":
    run_budget_audit(num_scenarios=1000, seed=42)
