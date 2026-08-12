from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import pandas as pd
from pathlib import Path

from app.services.ml_service import predict_risk


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
# History
# --------------------------------------------------

history = []


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

    # Find supplier in the Kaggle dataset
    supplier_rows = df[
        df["Supplier name"].astype(str).str.lower()
        == data.supplier.lower()
    ]

    # If supplier isn't found, use the first available row
    if supplier_rows.empty:
        supplier_row = df.iloc[0]
    else:
        supplier_row = supplier_rows.iloc[0]

    # Prepare the 16 features expected by XGBoost
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

    # Save to history
    history.append({
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk
    })

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

    dataset_path = (
        Path(__file__).resolve().parents[2]
        / "data"
        / "raw"
        / "supply_chain_data.csv"
    )

    df = pd.read_csv(dataset_path)

    supplier_rows = df[
        df["Supplier name"].astype(str).str.lower()
        == data.supplier.lower()
    ]

    if supplier_rows.empty:
        supplier_row = df.iloc[0]
    else:
        supplier_row = supplier_rows.iloc[0]

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

    risk = predict_risk(features)

    # Generate recommendation from predicted risk
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

    # Save to history
    history.append({
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk
    })

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
    return history