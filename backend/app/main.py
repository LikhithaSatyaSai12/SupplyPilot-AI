from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
from pathlib import Path
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.ml_service import predict_risk
from app.services.learning_service import get_historical_option_performance
from app.services.classification_service import classify_outcome
from app.services.retraining_service import (
    run_retraining_pipeline,
    check_discrepancy_trigger,
    get_active_version,
    get_retrain_status,
)
from app.database import SessionLocal, Base, engine
from app.models import (
    DecisionHistory,
    ExecutedDecision,
    ExecutionOutcome,
    ModelRetraining,
)
from app.prescription_engine import generate_prescriptions


# --------------------------------------------------
# Create database tables
# --------------------------------------------------

Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="SupplyPilot-AI API",
    description="Backend API for SupplyPilot-AI",
    version="1.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# REQUEST MODELS
# ==================================================


class PredictionRequest(BaseModel):
    supplier: str
    quantity: float


class RecommendationRequest(BaseModel):
    supplier: str
    quantity: float


class ExecuteDecisionRequest(BaseModel):
    supplier: str
    quantity: float
    risk: str
    action_id: str
    action: str
    description: str
    expected_cost: float
    expected_days: int
    expected_risk: str


class ExecutionOutcomeRequest(BaseModel):
    executed_decision_id: int
    actual_cost: float
    actual_days: int
    actual_risk: str


# ==================================================
# DATASET HELPERS
# ==================================================


def get_dataset():

    dataset_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "raw"
        / "supply_chain_data.csv"
    )

    if not dataset_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Dataset not found: {dataset_path}",
        )

    return pd.read_csv(dataset_path)


def get_supplier_row(df, supplier_name):

    supplier_rows = df[
        df["Supplier name"]
        .astype(str)
        .str.strip()
        .str.lower()
        == supplier_name.strip().lower()
    ]

    if supplier_rows.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Supplier '{supplier_name}' not found.",
        )

    return supplier_rows.iloc[0]


def prepare_features(supplier_row, quantity):

    return {
        "Price": supplier_row["Price"],
        "Availability": supplier_row["Availability"],
        "Number of products sold": supplier_row[
            "Number of products sold"
        ],
        "Revenue generated": supplier_row["Revenue generated"],
        "Stock levels": supplier_row["Stock levels"],
        "Lead times": supplier_row["Lead times"],
        "Order quantities": quantity,
        "Shipping times": supplier_row["Shipping times"],
        "Shipping costs": supplier_row["Shipping costs"],
        "Lead time": supplier_row["Lead time"],
        "Production volumes": supplier_row["Production volumes"],
        "Manufacturing lead time": supplier_row[
            "Manufacturing lead time"
        ],
        "Manufacturing costs": supplier_row[
            "Manufacturing costs"
        ],
        "Defect rates": supplier_row["Defect rates"],
        "Costs": supplier_row["Costs"],
    }


# ==================================================
# ROOT
# ==================================================


@app.get("/")
def root():

    return {
        "message": "Welcome to SupplyPilot-AI API",
        "status": "Running",
    }


# ==================================================
# SUPPLIERS
# ==================================================


@app.get("/suppliers")
def get_suppliers():

    df = get_dataset()

    suppliers = (
        df["Supplier name"]
        .dropna()
        .astype(str)
        .str.strip()
        .unique()
        .tolist()
    )

    return suppliers


# ==================================================
# ==================================================
# PREDICTION
# ==================================================


@app.post("/predict")
def predict(data: PredictionRequest):

    df = get_dataset()

    supplier_row = get_supplier_row(
        df,
        data.supplier,
    )

    features = prepare_features(
        supplier_row,
        data.quantity,
    )

    pred_res = predict_risk(features)
    risk = pred_res["risk"]
    predicted_delay_days = pred_res["predicted_delay_days"]
    disruption_probability = pred_res["disruption_probability"]

    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    db: Session = SessionLocal()

    try:

        decision = DecisionHistory(
            supplier=data.supplier,
            quantity=data.quantity,
            risk=risk,
            recommendation=f"Predicted delay: {predicted_delay_days} days ({disruption_probability}% disruption probability).",
            timestamp=timestamp,
        )

        db.add(decision)
        db.commit()

    finally:

        db.close()

    return {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk,
        "predicted_delay_days": predicted_delay_days,
        "disruption_probability": disruption_probability,
    }


# ==================================================
# RECOMMENDATIONS
# ==================================================


@app.post("/recommendations")
def recommendations(data: RecommendationRequest):

    df = get_dataset()

    supplier_row = get_supplier_row(
        df,
        data.supplier,
    )

    features = prepare_features(
        supplier_row,
        data.quantity,
    )

    pred_res = predict_risk(features)
    risk = pred_res["risk"]
    predicted_delay_days = pred_res["predicted_delay_days"]
    disruption_probability = pred_res["disruption_probability"]

    if risk == "High":

        recommendation = (
            f"Impending supply chain delay detected (~{predicted_delay_days} days, "
            f"{disruption_probability}% disruption prob). Consider an alternative supplier."
        )

    elif risk == "Medium":

        recommendation = (
            f"Moderate risk (~{predicted_delay_days} days delay). Confirm supplier schedule."
        )

    else:

        recommendation = (
            "Supplier appears reliable. Proceed with normal monitoring."
        )

    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    db: Session = SessionLocal()

    try:

        decision = DecisionHistory(
            supplier=data.supplier,
            quantity=data.quantity,
            risk=risk,
            recommendation=recommendation,
            timestamp=timestamp,
        )

        db.add(decision)
        db.commit()

    finally:

        db.close()

    return {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk,
        "predicted_delay_days": predicted_delay_days,
        "disruption_probability": disruption_probability,
        "recommendation": recommendation,
    }


# ==================================================
# SUPPLIER PRESCRIPTIONS
# ==================================================


@app.post("/prescriptions")
def prescriptions(data: RecommendationRequest):

    df = get_dataset()

    supplier_row = get_supplier_row(
        df,
        data.supplier,
    )

    features = prepare_features(
        supplier_row,
        data.quantity,
    )

    pred_res = predict_risk(features)
    risk = pred_res["risk"]
    predicted_delay_days = pred_res["predicted_delay_days"]
    disruption_probability = pred_res["disruption_probability"]

    # Fetch historical execution outcome statistics for closed-loop learning
    db: Session = SessionLocal()
    try:
        historical_stats = get_historical_option_performance(db)
    finally:
        db.close()

    prescription_options = generate_prescriptions(
        supplier=data.supplier,
        quantity=data.quantity,
        risk=risk,
        predicted_delay_days=predicted_delay_days,
        unit_price=float(supplier_row.get("Price", 50.0)),
        shipping_cost=float(supplier_row.get("Shipping costs", 5.0)),
        historical_stats=historical_stats,
    )

    return {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk,
        "predicted_delay_days": predicted_delay_days,
        "disruption_probability": disruption_probability,
        "prescriptions": prescription_options,
    }


# ==================================================
# EXECUTE PRESCRIPTION DECISION
# ==================================================


@app.post("/prescriptions/execute")
def execute_prescription(
    data: ExecuteDecisionRequest,
):

    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    db: Session = SessionLocal()

    try:

        executed_decision = ExecutedDecision(
            supplier=data.supplier,
            quantity=data.quantity,
            risk=data.risk,
            action_id=data.action_id,
            action=data.action,
            description=data.description,
            expected_cost=data.expected_cost,
            expected_days=data.expected_days,
            expected_risk=data.expected_risk,
            executed_at=timestamp,
        )

        db.add(executed_decision)

        db.commit()

        db.refresh(executed_decision)

        return {
            "message": "Prescription decision executed successfully.",
            "id": executed_decision.id,
            "supplier": executed_decision.supplier,
            "quantity": executed_decision.quantity,
            "risk": executed_decision.risk,
            "action_id": executed_decision.action_id,
            "action": executed_decision.action,
            "description": executed_decision.description,
            "expected_cost": executed_decision.expected_cost,
            "expected_days": executed_decision.expected_days,
            "expected_risk": executed_decision.expected_risk,
            "executed_at": executed_decision.executed_at,
        }

    finally:

        db.close()


# ==================================================
# DECISION HISTORY
# ==================================================


@app.get("/history")
def get_history():

    db: Session = SessionLocal()

    try:

        decisions = (
            db.query(DecisionHistory)
            .order_by(DecisionHistory.id.desc())
            .all()
        )

        return [
            {
                "id": decision.id,
                "supplier": decision.supplier,
                "quantity": decision.quantity,
                "risk": decision.risk,
                "recommendation": decision.recommendation,
                "timestamp": decision.timestamp,
            }
            for decision in decisions
        ]

    finally:

        db.close()


# ==================================================
# DELETE DECISION HISTORY
# ==================================================


@app.delete("/history/{decision_id}")
def delete_history(decision_id: int):

    db: Session = SessionLocal()

    try:

        decision = (
            db.query(DecisionHistory)
            .filter(
                DecisionHistory.id == decision_id
            )
            .first()
        )

        if decision is None:

            raise HTTPException(
                status_code=404,
                detail="Decision history record not found.",
            )

        db.delete(decision)

        db.commit()

        return {
            "message": "Decision history deleted successfully.",
            "id": decision_id,
        }

    finally:

        db.close()


# ==================================================
# EXECUTED DECISIONS
# ==================================================


@app.get("/executed-decisions")
def get_executed_decisions():

    db: Session = SessionLocal()

    try:

        decisions = (
            db.query(ExecutedDecision)
            .order_by(ExecutedDecision.id.desc())
            .all()
        )

        return [
            {
                "id": decision.id,
                "supplier": decision.supplier,
                "quantity": decision.quantity,
                "risk": decision.risk,
                "action_id": decision.action_id,
                "action": decision.action,
                "description": decision.description,
                "expected_cost": decision.expected_cost,
                "expected_days": decision.expected_days,
                "expected_risk": decision.expected_risk,
                "executed_at": decision.executed_at,
            }
            for decision in decisions
        ]

    finally:

        db.close()


# ==================================================
# DELETE EXECUTED DECISION
# ==================================================


@app.delete("/executed-decisions/{decision_id}")
def delete_executed_decision(
    decision_id: int,
):

    db: Session = SessionLocal()

    try:

        decision = (
            db.query(ExecutedDecision)
            .filter(
                ExecutedDecision.id == decision_id
            )
            .first()
        )

        if decision is None:

            raise HTTPException(
                status_code=404,
                detail="Executed decision not found.",
            )

        db.delete(decision)

        db.commit()

        return {
            "message": "Executed decision deleted successfully.",
            "id": decision_id,
        }

    finally:

        db.close()


# ==================================================
# EXECUTION OUTCOMES
# ==================================================


@app.post("/execution-outcomes")
def create_execution_outcome(
    data: ExecutionOutcomeRequest,
    background_tasks: BackgroundTasks,
):

    db: Session = SessionLocal()

    try:

        # ------------------------------------------
        # Find executed decision
        # ------------------------------------------

        executed_decision = (
            db.query(ExecutedDecision)
            .filter(
                ExecutedDecision.id
                == data.executed_decision_id
            )
            .first()
        )

        if executed_decision is None:

            raise HTTPException(
                status_code=404,
                detail="Executed decision not found.",
            )

        # ------------------------------------------
        # Enforce 1-to-(0..1) duplicate outcome prevention
        # ------------------------------------------
        existing_outcome = (
            db.query(ExecutionOutcome)
            .filter(ExecutionOutcome.executed_decision_id == data.executed_decision_id)
            .first()
        )
        if existing_outcome is not None:
            raise HTTPException(
                status_code=400,
                detail="Execution outcome already recorded for this decision.",
            )

        # ------------------------------------------
        # Deterministic Outcome Classification
        # ------------------------------------------
        eval_res = classify_outcome(
            expected_cost=executed_decision.expected_cost,
            actual_cost=data.actual_cost,
            expected_days=executed_decision.expected_days,
            actual_days=data.actual_days,
            expected_risk=executed_decision.expected_risk,
            actual_risk=data.actual_risk,
        )

        cost_variance = eval_res["cost_variance"]
        delivery_variance = eval_res["delivery_variance"]
        outcome_status = eval_res["outcome_status"]

        # ------------------------------------------
        # Timestamp
        # ------------------------------------------

        timestamp = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        # ------------------------------------------
        # Create outcome record
        # ------------------------------------------

        outcome = ExecutionOutcome(
            executed_decision_id=(
                executed_decision.id
            ),
            supplier=executed_decision.supplier,
            quantity=executed_decision.quantity,
            action_id=executed_decision.action_id,
            action=executed_decision.action,
            expected_cost=(
                executed_decision.expected_cost
            ),
            actual_cost=data.actual_cost,
            expected_days=(
                executed_decision.expected_days
            ),
            actual_days=data.actual_days,
            expected_risk=(
                executed_decision.expected_risk
            ),
            actual_risk=data.actual_risk,
            cost_variance=cost_variance,
            delivery_variance=delivery_variance,
            outcome_status=outcome_status,
            recorded_at=timestamp,
        )

        db.add(outcome)

        db.commit()

        db.refresh(outcome)

        # ------------------------------------------
        # Automated Discrepancy Retraining Trigger
        # ------------------------------------------
        should_retrain, trigger_reason = check_discrepancy_trigger(
            actual_cost=data.actual_cost,
            expected_cost=executed_decision.expected_cost,
            actual_days=data.actual_days,
            expected_days=executed_decision.expected_days,
            actual_risk=data.actual_risk,
            expected_risk=executed_decision.expected_risk,
        )

        if should_retrain:
            background_tasks.add_task(
                run_retraining_pipeline,
                trigger_reason=f"AUTOMATED_DISCREPANCY: {trigger_reason}",
            )

        return {
            "message": "Execution outcome recorded successfully.",
            "id": outcome.id,
            "executed_decision_id": (
                outcome.executed_decision_id
            ),
            "supplier": outcome.supplier,
            "quantity": outcome.quantity,
            "action_id": outcome.action_id,
            "action": outcome.action,
            "expected_cost": outcome.expected_cost,
            "actual_cost": outcome.actual_cost,
            "expected_days": outcome.expected_days,
            "actual_days": outcome.actual_days,
            "expected_risk": outcome.expected_risk,
            "actual_risk": outcome.actual_risk,
            "cost_variance": outcome.cost_variance,
            "delivery_variance": (
                outcome.delivery_variance
            ),
            "outcome_status": outcome.outcome_status,
            "cost_status": eval_res["cost_status"],
            "delivery_status": eval_res["delivery_status"],
            "risk_status": eval_res["risk_status"],
            "recorded_at": outcome.recorded_at,
            "retrain_triggered": should_retrain,
            "trigger_reason": trigger_reason if should_retrain else None,
        }

    finally:

        db.close()


# ==================================================
# AUTOMATED MODEL RETRAIN ENDPOINTS
# ==================================================


class RetrainRequest(BaseModel):
    reason: str = "MANUAL_API"


@app.post("/retrain")
def retrain_model_endpoint(
    background_tasks: BackgroundTasks,
    data: RetrainRequest = None,
):
    """
    Trigger automated model retraining pipeline in background.
    Prevents concurrent training runs via thread lock.
    """
    reason = data.reason if data and data.reason else "MANUAL_API"

    # Enqueue background task safely
    background_tasks.add_task(
        run_retraining_pipeline,
        trigger_reason=reason,
    )

    return {
        "message": "Model retraining pipeline initiated safely in background.",
        "status": "RETRAIN_STARTED",
        "active_model_version": get_active_version(),
        "trigger_reason": reason,
    }


@app.get("/retrain/status")
def get_retrain_status_endpoint():
    """
    Get current retraining pipeline status and active model version.
    """
    return get_retrain_status()


@app.get("/retrain/history")
def get_retrain_history_endpoint():
    """
    Get history of previous model retraining runs.
    """
    db: Session = SessionLocal()

    try:

        records = (
            db.query(ModelRetraining)
            .order_by(ModelRetraining.id.desc())
            .all()
        )

        return [
            {
                "id": record.id,
                "started_at": record.started_at,
                "completed_at": record.completed_at,
                "status": record.status,
                "trigger_reason": record.trigger_reason,
                "number_of_records": record.number_of_records,
                "model_version": record.model_version,
                "risk_accuracy": record.risk_accuracy,
                "delay_mae": record.delay_mae,
                "error_message": record.error_message,
            }
            for record in records
        ]

    finally:

        db.close()



# ==================================================
# GET EXECUTION OUTCOMES
# ==================================================


@app.get("/execution-outcomes")
def get_execution_outcomes():

    db: Session = SessionLocal()

    try:

        outcomes = (
            db.query(ExecutionOutcome)
            .order_by(ExecutionOutcome.id.desc())
            .all()
        )

        return [
            {
                "id": outcome.id,
                "executed_decision_id": (
                    outcome.executed_decision_id
                ),
                "supplier": outcome.supplier,
                "quantity": outcome.quantity,
                "action_id": outcome.action_id,
                "action": outcome.action,
                "expected_cost": outcome.expected_cost,
                "actual_cost": outcome.actual_cost,
                "expected_days": outcome.expected_days,
                "actual_days": outcome.actual_days,
                "expected_risk": outcome.expected_risk,
                "actual_risk": outcome.actual_risk,
                "cost_variance": outcome.cost_variance,
                "delivery_variance": (
                    outcome.delivery_variance
                ),
                "outcome_status": outcome.outcome_status,
                "recorded_at": outcome.recorded_at,
            }
            for outcome in outcomes
        ]

    finally:

        db.close()


# ==================================================
# DELETE EXECUTION OUTCOME
# ==================================================


@app.delete("/execution-outcomes/{outcome_id}")
def delete_execution_outcome(
    outcome_id: int,
):

    db: Session = SessionLocal()

    try:

        outcome = (
            db.query(ExecutionOutcome)
            .filter(
                ExecutionOutcome.id == outcome_id
            )
            .first()
        )

        if outcome is None:

            raise HTTPException(
                status_code=404,
                detail="Execution outcome not found.",
            )

        db.delete(outcome)

        db.commit()

        return {
            "message": "Execution outcome deleted successfully.",
            "id": outcome_id,
        }

    finally:

        db.close()