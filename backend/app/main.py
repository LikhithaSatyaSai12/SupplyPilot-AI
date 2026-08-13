from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
from pathlib import Path
from datetime import datetime

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
# CORS - Allow React frontend to connect
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

    dataset_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "raw"
        / "supply_chain_data.csv"
    )

    df = pd.read_csv(dataset_path)

    suppliers = (
        df["Supplier name"]
        .astype(str)
        .str.strip()
        .drop_duplicates()
        .sort_values()
        .tolist()
    )

    return suppliers


# --------------------------------------------------
# Prediction endpoint - XGBoost
# --------------------------------------------------

@app.post("/predict")
def predict(data: PredictionRequest):

    dataset_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "raw"
        / "supply_chain_data.csv"
    )

    df = pd.read_csv(dataset_path)

    # Clean supplier name
    supplier_name = data.supplier.strip()

    # Find supplier in dataset
    supplier_rows = df[
        df["Supplier name"]
        .astype(str)
        .str.strip()
        .str.lower()
        == supplier_name.lower()
    ]

    # If supplier is not found, use first available row
    if supplier_rows.empty:
        supplier_row = df.iloc[0]
    else:
        supplier_row = supplier_rows.iloc[0]

    # Prepare features expected by XGBoost
    features = {
        "Price": supplier_row["Price"],
        "Availability": supplier_row["Availability"],
        "Number of products sold": supplier_row["Number of products sold"],
        "Revenue generated": supplier_row["Revenue generated"],
        "Stock levels": supplier_row["Stock levels"],
        "Lead times": supplier_row["Lead times"],
        "Order quantities": data.quantity,
        "Shipping times": supplier_row["Shipping times"],
        "Shipping costs": supplier_row["Shipping costs"],
        "Lead time": supplier_row["Lead time"],
        "Production volumes": supplier_row["Production volumes"],
        "Manufacturing lead time": supplier_row["Manufacturing lead time"],
        "Manufacturing costs": supplier_row["Manufacturing costs"],
        "Defect rates": supplier_row["Defect rates"],
        "Costs": supplier_row["Costs"],
    }

    # Predict using trained XGBoost model
    risk = predict_risk(features)

    # Save prediction to SQLite database
    db = SessionLocal()

    try:
        history_record = DecisionHistory(
            supplier=supplier_name,
            quantity=data.quantity,
            risk=risk,
            recommendation="Prediction generated.",
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        db.add(history_record)
        db.commit()

    finally:
        db.close()

    return {
        "supplier": supplier_name,
        "quantity": data.quantity,
        "risk": risk
    }


# --------------------------------------------------
# Recommendation endpoint
# --------------------------------------------------

@app.post("/recommendations")
def recommendations(data: RecommendationRequest):

    dataset_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "raw"
        / "supply_chain_data.csv"
    )

    df = pd.read_csv(dataset_path)

    # Clean supplier name
    supplier_name = data.supplier.strip()

    # Find supplier in dataset
    supplier_rows = df[
        df["Supplier name"]
        .astype(str)
        .str.strip()
        .str.lower()
        == supplier_name.lower()
    ]

    # If supplier is not found, use first available row
    if supplier_rows.empty:
        supplier_row = df.iloc[0]
    else:
        supplier_row = supplier_rows.iloc[0]

    # Prepare features expected by XGBoost
    features = {
        "Price": supplier_row["Price"],
        "Availability": supplier_row["Availability"],
        "Number of products sold": supplier_row["Number of products sold"],
        "Revenue generated": supplier_row["Revenue generated"],
        "Stock levels": supplier_row["Stock levels"],
        "Lead times": supplier_row["Lead times"],
        "Order quantities": data.quantity,
        "Shipping times": supplier_row["Shipping times"],
        "Shipping costs": supplier_row["Shipping costs"],
        "Lead time": supplier_row["Lead time"],
        "Production volumes": supplier_row["Production volumes"],
        "Manufacturing lead time": supplier_row["Manufacturing lead time"],
        "Manufacturing costs": supplier_row["Manufacturing costs"],
        "Defect rates": supplier_row["Defect rates"],
        "Costs": supplier_row["Costs"],
    }

    # Predict risk
    risk = predict_risk(features)

    # Generate recommendation
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

    # Save recommendation to SQLite database
    db = SessionLocal()

    try:
        history_record = DecisionHistory(
            supplier=supplier_name,
            quantity=data.quantity,
            risk=risk,
            recommendation=recommendation,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

        db.add(history_record)
        db.commit()

    finally:
        db.close()

    return {
        "supplier": supplier_name,
        "quantity": data.quantity,
        "risk": risk,
        "recommendation": recommendation
    }


# --------------------------------------------------
# History endpoint
# --------------------------------------------------

@app.get("/history")
def get_history():

    db = SessionLocal()

    try:
        records = (
            db.query(DecisionHistory)
            .order_by(DecisionHistory.id.desc())
            .all()
        )

        return [
            {
                "id": record.id,
                "supplier": record.supplier,
                "quantity": record.quantity,
                "risk": record.risk,
                "recommendation": record.recommendation,
                "timestamp": record.timestamp
            }
            for record in records
        ]

    finally:
        db.close()