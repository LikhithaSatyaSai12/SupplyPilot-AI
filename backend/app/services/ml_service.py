import joblib
import pandas as pd

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]

RISK_MODEL_PATH = BASE_DIR / "data" / "models" / "supply_chain_risk_model.pkl"
DELAY_MODEL_PATH = BASE_DIR / "data" / "models" / "supply_chain_delay_model.pkl"
ENCODER_PATH = BASE_DIR / "data" / "models" / "risk_label_encoder.pkl"


# Load models and encoder once when the service starts
risk_model = joblib.load(RISK_MODEL_PATH)

if DELAY_MODEL_PATH.exists():
    delay_model = joblib.load(DELAY_MODEL_PATH)
else:
    delay_model = None

label_encoder = joblib.load(ENCODER_PATH)


def reload_ml_models():
    """
    Reload active model artifacts from disk into memory following a successful retraining run.
    """
    global risk_model, delay_model, label_encoder
    risk_model = joblib.load(RISK_MODEL_PATH)
    if DELAY_MODEL_PATH.exists():
        delay_model = joblib.load(DELAY_MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    print("ML models reloaded in memory successfully.")


def predict_risk(features: dict) -> dict:
    """
    Predict supply-chain risk, delay duration in days, and disruption probability.

    Returns:
        dict: {
            "risk": str ("Low" | "Medium" | "High"),
            "predicted_delay_days": float,
            "disruption_probability": float (0.0 to 100.0),
            "model_version": str
        }
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

    # 1. Risk Classification
    prediction = risk_model.predict(input_data)
    risk_label = label_encoder.inverse_transform(prediction)[0]

    # 2. Model-derived disruption probability based on risk-class probabilities
    probabilities = risk_model.predict_proba(input_data)[0]
    class_prob_map = dict(zip(label_encoder.classes_, probabilities))

    high_prob = float(class_prob_map.get("High", 0.0))
    medium_prob = float(class_prob_map.get("Medium", 0.0))

    # Model-derived disruption probability formula
    disruption_prob = round((high_prob + 0.5 * medium_prob) * 100, 1)

    # 3. Predicted Delay Duration (in days)
    if delay_model is not None:
        raw_delay_pred = float(delay_model.predict(input_data)[0])
        predicted_delay_days = max(0.0, round(raw_delay_pred, 1))
    else:
        # Fallback estimated delay if delay model is not yet loaded
        lead_time = float(features.get("Lead time", 15))
        predicted_delay_days = max(0.0, round(lead_time * 0.5, 1))

    return {
        "risk": risk_label,
        "predicted_delay_days": predicted_delay_days,
        "disruption_probability": disruption_prob,
    }
