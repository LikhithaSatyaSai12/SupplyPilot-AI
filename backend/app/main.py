from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
from pathlib import Path
from datetime import datetime

from sqlalchemy.orm import Session

from app.services.ml_service import predict_risk
from app.database import SessionLocal, Base, engine
from app.models import DecisionHistory


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
    version="1.0.0"
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


# --------------------------------------------------
# Request models
# --------------------------------------------------

class PredictionRequest(BaseModel):
    supplier: str
    quantity: float


class RecommendationRequest(BaseModel):
    supplier: str
    quantity: float


# --------------------------------------------------
# Dataset helper
# --------------------------------------------------

def get_dataset():

    dataset_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "raw"
        / "supply_chain_data.csv"
    )

    return pd.read_csv(dataset_path)


# --------------------------------------------------
# Supplier helper
# --------------------------------------------------

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


# --------------------------------------------------
# Feature helper
# --------------------------------------------------

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


# --------------------------------------------------
# Root endpoint
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "message": "Welcome to SupplyPilot-AI API",
        "status": "Running"
    }


# --------------------------------------------------
# Suppliers endpoint
# --------------------------------------------------

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


# --------------------------------------------------
# Prediction endpoint
# --------------------------------------------------

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


# --------------------------------------------------
# Recommendation endpoint
# --------------------------------------------------

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


# --------------------------------------------------
# History endpoint
# --------------------------------------------------

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


# --------------------------------------------------
# Delete history record
# --------------------------------------------------

@app.delete("/history/{decision_id}")
def delete_history(decision_id: int):

    db: Session = SessionLocal()

    try:

        decision = (
            db.query(DecisionHistory)
            .filter(DecisionHistory.id == decision_id)
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