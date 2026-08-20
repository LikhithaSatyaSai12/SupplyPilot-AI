from typing import List, Dict, Optional, Tuple
import numpy as np
from scipy import optimize as opt
from pulp import (
    LpMaximize,
    LpProblem,
    LpVariable,
    lpSum,
    LpStatus,
    PULP_CBC_CMD,
)



def compute_option_scores(
    options: List[Dict],
    max_budget: float,
    max_time_days: float,
) -> Dict[str, float]:
    """
    Compute multi-objective score balancing delivery speed, cost savings, and risk penalty.
    """
    scores = {}
    for option in options:
        speed_score = max(0.0, max_time_days - option["days"])
        cost_score = max(0.0, (max_budget - option["cost"]) / 1000.0)
        risk_penalty = {
            "Low": 0.0,
            "Medium": 2.0,
            "High": 5.0,
        }.get(option["risk"], 3.0)

        scores[option["id"]] = speed_score + cost_score - risk_penalty
    return scores


def solve_prescriptions_scipy(
    feasible_options: List[Dict],
    max_budget: float,
    max_time_days: float,
) -> Optional[str]:
    """
    Mathematical Optimization Engine using SciPy Linear Programming / MILP.
    Solves binary decision program over feasible alternative actions:
        maximize   c^T x
        subject to sum(x_i) == 1
                   sum(cost_i * x_i) <= max_budget
                   sum(days_i * x_i) <= max_time_days
                   x_i in {0, 1}
    """
    if not feasible_options:
        return None

    if len(feasible_options) == 1:
        return feasible_options[0]["id"]

    n = len(feasible_options)
    scores = compute_option_scores(feasible_options, max_budget, max_time_days)
    score_vec = np.array([scores[opt_item["id"]] for opt_item in feasible_options], dtype=float)
    cost_vec = np.array([opt_item["cost"] for opt_item in feasible_options], dtype=float)
    day_vec = np.array([opt_item["days"] for opt_item in feasible_options], dtype=float)

    # SciPy minimizes obj = c^T x, so we minimize -score_vec
    c = -score_vec

    try:
        # SciPy MILP formulation
        integrality = np.ones(n)
        bounds = opt.Bounds(0, 1)

        # Constraints:
        # 1. Exact one selection: 1 <= 1^T x <= 1
        # 2. Budget: 0 <= cost^T x <= max_budget
        # 3. Time: 0 <= days^T x <= max_time_days
        A = np.vstack([
            np.ones(n),
            cost_vec,
            day_vec,
        ])
        lhs = np.array([1.0, 0.0, 0.0])
        rhs = np.array([1.0, float(max_budget), float(max_time_days)])

        constraints = opt.LinearConstraint(A, lhs, rhs)
        res = opt.milp(c=c, integrality=integrality, bounds=bounds, constraints=constraints)

        if res.success and res.x is not None:
            best_idx = int(np.argmax(res.x))
            return feasible_options[best_idx]["id"]
    except Exception as err:
        print(f"Warning: SciPy MILP encountered error: {err}, falling back to SciPy linprog.")

    # SciPy linprog fallback
    try:
        A_eq = [[1.0] * n]
        b_eq = [1.0]
        A_ub = [cost_vec.tolist(), day_vec.tolist()]
        b_ub = [float(max_budget), float(max_time_days)]

        res_lp = opt.linprog(
            c=c,
            A_eq=A_eq,
            b_eq=b_eq,
            A_ub=A_ub,
            b_ub=b_ub,
            bounds=(0, 1),
            method="highs",
        )
        if res_lp.success and res_lp.x is not None:
            best_idx = int(np.argmax(res_lp.x))
            return feasible_options[best_idx]["id"]
    except Exception as err:
        print(f"Warning: SciPy linprog fallback encountered error: {err}")

    # Fallback to max score among feasible options
    return max(feasible_options, key=lambda x: scores[x["id"]])["id"]


def solve_prescriptions_pulp(
    feasible_options: List[Dict],
    max_budget: float,
    max_time_days: float,
) -> Optional[str]:
    """
    Mathematical Optimization Engine using PuLP Linear Programming.
    """
    if not feasible_options:
        return None

    if len(feasible_options) == 1:
        return feasible_options[0]["id"]

    model = LpProblem("SupplyPilot_PuLP_Prescription_Optimization", LpMaximize)

    variables = {
        option["id"]: LpVariable(
            f"select_{option['id']}",
            cat="Binary",
        )
        for option in feasible_options
    }

    # Constraint 1: Select exactly one feasible prescription
    model += lpSum(variables[opt_item["id"]] for opt_item in feasible_options) == 1

    # Constraint 2: Budget
    model += lpSum(opt_item["cost"] * variables[opt_item["id"]] for opt_item in feasible_options) <= max_budget

    # Constraint 3: Delivery time
    model += lpSum(opt_item["days"] * variables[opt_item["id"]] for opt_item in feasible_options) <= max_time_days

    # Objective
    scores = compute_option_scores(feasible_options, max_budget, max_time_days)
    model += lpSum(scores[opt_item["id"]] * variables[opt_item["id"]] for opt_item in feasible_options)

    model.solve(PULP_CBC_CMD(msg=False))

    if LpStatus[model.status] == "Optimal":

        for option in feasible_options:
            if variables[option["id"]].value() == 1:
                return option["id"]

    return max(feasible_options, key=lambda x: scores[x["id"]])["id"]


def generate_prescriptions(
    supplier: str,
    quantity: float,
    risk: str,
    predicted_delay_days: float = 14.0,
    unit_price: float = 50.0,
    shipping_cost: float = 5.0,
    historical_stats: Dict[str, Dict] = None,
    max_budget: float = 20000.0,
    max_time_days: float = 30.0,
    supplier_capacity: float = 5000.0,
    stock_level: float = 50.0,
    min_inventory: float = 10.0,
    solver: str = "scipy",
) -> List[Dict]:
    """
    Generate three dynamic alternative supply-chain actions with closed-loop optimizer learning
    and mathematical business constraints:
      1. Budget:        sum(cost_i * x_i) <= max_budget ($20,000)
      2. Delivery Time: sum(days_i * x_i) <= max_time_days (30 days)
      3. Capacity:      quantity <= Capacity_i
      4. Min Inventory: CurrentStock - QuantityUsed >= min_inventory
    """
    max_budget = float(max_budget)
    max_time_days = float(max_time_days)
    supplier_capacity = float(supplier_capacity) if supplier_capacity > 0 else 5000.0
    stock_level = float(stock_level) if stock_level >= 0 else 50.0
    min_inventory = float(min_inventory) if min_inventory >= 0 else 10.0

    risk = str(risk).capitalize()
    historical_stats = historical_stats or {}

    # Baseline Order Parameters
    quantity = float(quantity)
    unit_price = float(unit_price) if unit_price > 0 else 50.0
    base_order_value = quantity * unit_price
    delay_days = max(0.5, float(predicted_delay_days))

    # Candidate Business Alternatives
    # Option A: Air Freight
    air_freight_cost = round(min(25000.0, 3000.0 + (quantity * 2.50)), 2)
    air_freight_days = round(max(2.0, delay_days * 0.20 + 2.0), 1)
    air_capacity = 50000.0  # Expedited air carriers accommodate high emergency volume

    # Option B: Secondary Supplier at 10% premium
    secondary_cost = round(base_order_value * 0.10, 2)
    secondary_days = round(max(5.0, delay_days * 0.50 + 4.0), 1)
    secondary_capacity = max(1000.0, supplier_capacity * 1.5)

    # Option C: Delay Product Launch (absorb delay without emergency freight)
    delay_cost = round(min(15000.0, 500.0 + (delay_days * 300.0)), 2)
    delay_product_days = round(delay_days + 4.0, 1)
    delay_capacity = 1000000.0

    raw_options = [
        {
            "id": "A",
            "action": "Air Freight",
            "baseline_description": "Expedited air freight mitigates delay.",
            "baseline_cost": air_freight_cost,
            "baseline_days": air_freight_days,
            "risk": "Low",
            "capacity": air_capacity,
            "inventory_impact": 0.0,
        },
        {
            "id": "B",
            "action": "Secondary Supplier",
            "baseline_description": "Source from secondary supplier at 10% premium.",
            "baseline_cost": secondary_cost,
            "baseline_days": secondary_days,
            "risk": "Medium",
            "capacity": secondary_capacity,
            "inventory_impact": 0.0,
        },
        {
            "id": "C",
            "action": "Delay Product Launch",
            "baseline_description": "Accept predicted delay and avoid emergency freight.",
            "baseline_cost": delay_cost,
            "baseline_days": delay_product_days,
            "risk": "High",
            "capacity": delay_capacity,
            "inventory_impact": max(0.0, quantity * 0.1),
        },
    ]

    options = []

    # Apply Closed-Loop Historical Learning Adjustments
    for raw in raw_options:
        opt_id = raw["id"]
        stats = historical_stats.get(opt_id, {})

        hist_count = stats.get("count", 0)
        avg_cost_var = stats.get("avg_cost_variance", 0.0)
        avg_deliv_var = stats.get("avg_delivery_variance", 0.0)
        confidence = stats.get("confidence", 0.0)

        # Confidence-weighted adjustments
        cost_adj = round(confidence * avg_cost_var, 2)
        deliv_adj = round(confidence * avg_deliv_var, 1)

        adjusted_cost = max(0.0, round(raw["baseline_cost"] + cost_adj, 2))
        adjusted_days = max(1.0, round(raw["baseline_days"] + deliv_adj, 1))

        if hist_count > 0 and (abs(cost_adj) > 0.01 or abs(deliv_adj) > 0.1):
            learning_note = f" [Learned adjustment: cost {'+' if cost_adj >= 0 else ''}${cost_adj:,.0f}, delivery {'+' if deliv_adj >= 0 else ''}{deliv_adj}d based on {hist_count} past outcome(s)]"
        else:
            learning_note = ""

        description = f"{raw['baseline_description']} ~{adjusted_days} days delivery, ${adjusted_cost:,.2f} estimated cost.{learning_note}"

        # Mathematical Business Constraint Checks:
        budget_feasible = adjusted_cost <= max_budget
        time_feasible = adjusted_days <= max_time_days
        capacity_feasible = quantity <= raw["capacity"]
        inventory_feasible = (stock_level - raw["inventory_impact"]) >= min_inventory

        overall_feasible = (
            budget_feasible
            and time_feasible
            and capacity_feasible
            and inventory_feasible
        )

        option = {
            "id": opt_id,
            "action": raw["action"],
            "description": description,
            "cost": adjusted_cost,
            "days": adjusted_days,
            "risk": raw["risk"],
            "baseline_cost": raw["baseline_cost"],
            "baseline_days": raw["baseline_days"],
            "historical_executions": hist_count,
            "historical_avg_cost_variance": avg_cost_var,
            "historical_avg_delivery_variance": avg_deliv_var,
            "learning_confidence": confidence,
            "feasible": overall_feasible,
            "budget_feasible": budget_feasible,
            "time_feasible": time_feasible,
            "capacity_feasible": capacity_feasible,
            "inventory_feasible": inventory_feasible,
            "capacity": raw["capacity"],
        }
        options.append(option)

    feasible_options = [op for op in options if op["feasible"]]

    # Run Prescriptive Solvers
    selected_id = None
    if feasible_options:
        if solver.lower() == "pulp":
            selected_id = solve_prescriptions_pulp(feasible_options, max_budget, max_time_days)
        else:
            # Default to SciPy Linear Programming solver
            selected_id = solve_prescriptions_scipy(feasible_options, max_budget, max_time_days)

    # Fallback to cheapest feasible option if solver produces no selection
    if selected_id is None and feasible_options:
        selected_id = min(feasible_options, key=lambda x: x["cost"])["id"]

    # Assemble final response preserving all API contract fields
    results = []
    for option in options:
        result = option.copy()
        result["supplier"] = supplier
        result["quantity"] = quantity
        result["optimal"] = option["id"] == selected_id and option["feasible"]
        results.append(result)

    return results

