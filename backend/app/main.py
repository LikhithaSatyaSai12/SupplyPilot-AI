from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
from pathlib import Path
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.ml_service import predict_risk
from app.prescription_engine import generate_prescriptions
from app.database import SessionLocal, Base, engine
from app.models import DecisionHistory


# ============================================================
# CREATE DATABASE TABLES
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="SupplyPilot-AI API",
    description="Backend API for SupplyPilot-AI",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

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


# ============================================================
# REQUEST MODELS
# ============================================================

class PredictionRequest(BaseModel):
    supplier: str
    quantity: float


class RecommendationRequest(BaseModel):
    supplier: str
    quantity: float


class PrescriptionRequest(BaseModel):
    supplier: str
    quantity: float


class ExecutePrescriptionRequest(BaseModel):
    supplier: str
    quantity: float
    prescription_id: str
    action: str
    cost: float
    days: int
    risk: str
    description: str


# ============================================================
# DATASET HELPER
# ============================================================

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
            detail=f"Dataset not found: {dataset_path}"
        )

    return pd.read_csv(dataset_path)


# ============================================================
# SUPPLIER HELPER
# ============================================================

def get_supplier_row(df, supplier_name):

    supplier_rows = df[
        df["Supplier name"]
        .astype(str)
        .str.strip()
        .str.lower()
        == supplier_name.strip().lower()
    ]

    if supplier_rows.empty:

        return df.iloc[0]

    return supplier_rows.iloc[0]


# ============================================================
# FEATURE HELPER
# ============================================================

def prepare_features(supplier_row, quantity):

    return {
        "Price": supplier_row["Price"],
        "Availability": supplier_row["Availability"],
        "Number of products sold": supplier_row["Number of products sold"],
        "Revenue generated": supplier_row["Revenue generated"],
        "Stock levels": supplier_row["Stock levels"],
        "Lead times": supplier_row["Lead times"],
        "Order quantities": quantity,
        "Shipping times": supplier_row["Shipping times"],
        "Shipping costs": supplier_row["Shipping costs"],
        "Lead time": supplier_row["Lead time"],
        "Production volumes": supplier_row["Production volumes"],
        "Manufacturing lead time": supplier_row["Manufacturing lead time"],
        "Manufacturing costs": supplier_row["Manufacturing costs"],
        "Defect rates": supplier_row["Defect rates"],
        "Costs": supplier_row["Costs"],
    }


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Welcome to SupplyPilot-AI API",
        "status": "Running"
    }


# ============================================================
# SUPPLIERS ENDPOINT
# ============================================================

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


# ============================================================
# PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
def predict(data: PredictionRequest):

    df = get_dataset()

    supplier_row = get_supplier_row(
        df,
        data.supplier
    )

    features = prepare_features(
        supplier_row,
        data.quantity
    )

    risk = predict_risk(features)

    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    db: Session = SessionLocal()

    try:

        decision = DecisionHistory(
            supplier=data.supplier,
            quantity=data.quantity,
            risk=risk,
            recommendation="Prediction generated.",
            timestamp=timestamp
        )

        db.add(decision)
        db.commit()

    finally:

        db.close()

    return {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk
    }


# ============================================================
# RECOMMENDATION ENDPOINT
# ============================================================

@app.post("/recommendations")
def recommendations(data: RecommendationRequest):

    df = get_dataset()

    supplier_row = get_supplier_row(
        df,
        data.supplier
    )

    features = prepare_features(
        supplier_row,
        data.quantity
    )

    risk = predict_risk(features)

    if risk == "High":

        recommendation = (
            "Consider an alternative supplier and closely monitor the shipment."
        )

    elif risk == "Medium":

        recommendation = (
            "Confirm the supplier schedule and monitor the shipment."
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
            timestamp=timestamp
        )

        db.add(decision)
        db.commit()

    finally:

        db.close()

    return {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk,
        "recommendation": recommendation
    }


# ============================================================
# PRESCRIPTION GENERATION ENDPOINT
# ============================================================

@app.post("/prescriptions")
def prescriptions(data: PrescriptionRequest):

    if data.quantity <= 0:

        raise HTTPException(
            status_code=400,
            detail="Order quantity must be greater than zero."
        )

    df = get_dataset()

    supplier_row = get_supplier_row(
        df,
        data.supplier
    )

    features = prepare_features(
        supplier_row,
        data.quantity
    )

    risk = predict_risk(features)

    prescription_options = generate_prescriptions(
        supplier=data.supplier,
        quantity=data.quantity,
        risk=risk
    )

    if not prescription_options:

        raise HTTPException(
            status_code=400,
            detail="No feasible prescription could be generated."
        )

    return {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk,
        "prescriptions": prescription_options
    }


# ============================================================
# EXECUTE PRESCRIPTION ENDPOINT
# ============================================================

@app.post("/prescriptions/execute")
def execute_prescription(data: ExecutePrescriptionRequest):

    timestamp = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    recommendation = (
        f"Executed prescription: {data.action}. "
        f"Estimated cost: ${data.cost:,.2f}. "
        f"Estimated delivery: {data.days} days. "
        f"{data.description}"
    )

    db: Session = SessionLocal()

    try:

        decision = DecisionHistory(
            supplier=data.supplier,
            quantity=data.quantity,
            risk=data.risk,
            recommendation=recommendation,
            timestamp=timestamp
        )

        db.add(decision)
        db.commit()
        db.refresh(decision)

        return {
            "message": "Prescription executed successfully.",
            "decision_id": decision.id,
            "supplier": data.supplier,
            "quantity": data.quantity,
            "prescription_id": data.prescription_id,
            "action": data.action,
            "cost": data.cost,
            "days": data.days,
            "risk": data.risk,
            "description": data.description,
            "timestamp": timestamp
        }

    finally:

        db.close()


# ============================================================
# HISTORY ENDPOINT
# ============================================================

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


# ============================================================
# DELETE HISTORY RECORD
# ============================================================

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
                detail="Decision history record not found."
            )

        db.delete(decision)

        db.commit()

        return {
            "message": "Decision history deleted successfully.",
            "id": decision_id
        }

    finally:

        db.close()