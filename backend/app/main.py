from fastapi import FastAPI

app = FastAPI(
    title="SupplyPilot-AI API",
    description="Backend API for SupplyPilot-AI",
    version="1.0.0"
)

@app.get("/")
def root():
    return {
        "message": "Welcome to SupplyPilot-AI API",
        "status": "Running"
    }