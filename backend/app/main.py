from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="SupplyPilot-AI API",
    description="Backend API for SupplyPilot-AI",
    version="1.0.0"
)

# Allow frontend to connect to backend
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


# Request model
class PredictionRequest(BaseModel):
    supplier: str
    quantity: float


# Store prediction history
history = []


# Home / health check
@app.get("/")
def root():
    return {
        "message": "Welcome to SupplyPilot-AI API",
        "status": "Running"
    }


# Prediction endpoint
@app.post("/predict")
def predict_risk(data: PredictionRequest):

    if data.quantity > 500:
        risk = "High"
    elif data.quantity > 100:
        risk = "Medium"
    else:
        risk = "Low"

    result = {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk
    }

    # Save prediction to history
    history.append(result)

    return result


# Recommendation endpoint
@app.post("/recommendations")
def recommendations(data: PredictionRequest):

    if data.quantity > 500:
        risk = "High"
        recommendation = (
            "Consider splitting the order and monitoring "
            "the supplier closely."
        )

    elif data.quantity > 100:
        risk = "Medium"
        recommendation = (
            "Confirm the supplier schedule and monitor "
            "the shipment."
        )

    else:
        risk = "Low"
        recommendation = (
            "Proceed with the order and maintain normal monitoring."
        )

    result = {
        "supplier": data.supplier,
        "quantity": data.quantity,
        "risk": risk,
        "recommendation": recommendation
    }

    # Save recommendation to history
    history.append(result)

    return result


# History endpoint
@app.get("/history")
def get_history():
    return history


# Run the application directly
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )