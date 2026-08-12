import joblib
import pandas as pd

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]

MODEL_PATH = BASE_DIR / "data" / "models" / "supply_chain_risk_model.pkl"
ENCODER_PATH = BASE_DIR / "data" / "models" / "risk_label_encoder.pkl"


# Load model once when the service starts
model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)


def predict_risk(features: dict) -> str:
    """
    Predict supply-chain risk using the trained XGBoost model.
    """

    feature_order = [
        "Price",
        "Availability",
        "Number of products sold",
        "Revenue generated",
        "Stock levels",
        "Lead times",
        "Order quantities",
        "Shipping times",
        "Shipping costs",
        "Lead time",
        "Production volumes",
        "Manufacturing lead time",
        "Manufacturing costs",
        "Defect rates",
        "Costs",
    ]

    input_data = pd.DataFrame(
        [[features[column] for column in feature_order]],
        columns=feature_order,
    )

    prediction = model.predict(input_data)

    risk = label_encoder.inverse_transform(prediction)[0]

    return risk