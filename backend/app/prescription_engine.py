from typing import List, Dict

from pulp import (
    LpMaximize,
    LpProblem,
    LpVariable,
    lpSum,
    LpStatus,
)


def generate_prescriptions(
    supplier: str,
    quantity: float,
    risk: str,
) -> List[Dict]:
    """
    Generate three alternative supply-chain actions.

    The optimizer balances:
    - cost
    - delivery speed
    - operational risk

    Hard budget constraint:
    maximum additional cost = $20,000
    """

    max_budget = 20000

    risk = risk.capitalize()

    # Base estimates for the three alternatives.
    options = [
        {
            "id": "A",
            "action": "Air Freight",
            "description": "Use expedited air freight to reduce delivery time.",
            "cost": 15000,
            "days": 3,
            "risk": "Low",
        },
        {
            "id": "B",
            "action": "Secondary Supplier",
            "description": "Purchase from a secondary supplier at a premium.",
            "cost": round(quantity * 0.10 * 100, 2),
            "days": 7,
            "risk": "Medium",
        },
        {
            "id": "C",
            "action": "Delay Product Launch",
            "description": "Delay the final product launch and avoid emergency freight.",
            "cost": 5000,
            "days": 14,
            "risk": "High",
        },
    ]

    # Keep every candidate within the hard budget constraint.
    valid_options = [
        option
        for option in options
        if option["cost"] <= max_budget
    ]

    if not valid_options:
        return []

    # Optimization model.
    model = LpProblem(
        "SupplyPilot_Prescription_Optimization",
        LpMaximize,
    )

    variables = {
        option["id"]: LpVariable(
            f"select_{option['id']}",
            cat="Binary",
        )
        for option in valid_options
    }

    # Exactly one prescription is selected as the optimal choice.
    model += lpSum(
        variables[option["id"]]
        for option in valid_options
    ) == 1

    # Score rewards faster delivery and lower cost.
    scores = {}

    for option in valid_options:
        speed_score = max(0, 20 - option["days"])
        cost_score = max(
            0,
            (max_budget - option["cost"]) / 1000,
        )

        risk_penalty = {
            "Low": 0,
            "Medium": 2,
            "High": 5,
        }.get(option["risk"], 3)

        scores[option["id"]] = (
            speed_score
            + cost_score
            - risk_penalty
        )

    model += lpSum(
        scores[option["id"]] * variables[option["id"]]
        for option in valid_options
    )

    model.solve()

    selected_id = None

    if LpStatus[model.status] == "Optimal":
        for option in valid_options:
            if variables[option["id"]].value() == 1:
                selected_id = option["id"]
                break

    # Return all three alternatives, with the optimal one highlighted.
    results = []

    for option in valid_options:
        result = option.copy()

        result["supplier"] = supplier
        result["quantity"] = quantity
        result["optimal"] = option["id"] == selected_id

        results.append(result)

    return results