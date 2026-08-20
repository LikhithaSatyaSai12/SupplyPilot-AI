import pandas as pd
import joblib
from pathlib import Path
import numpy as np


BASE_DIR = Path(__file__).resolve().parents[3]

RISK_MODEL_PATH = BASE_DIR / "data" / "models" / "supply_chain_risk_model.pkl"
DELAY_MODEL_PATH = BASE_DIR / "data" / "models" / "supply_chain_delay_model.pkl"
ENCODER_PATH = BASE_DIR / "data" / "models" / "risk_label_encoder.pkl"
DATA_PATH = BASE_DIR / "data" / "processed" / "processed_supply_chain_data.csv"

# Exact 15 feature columns expected by trained models in training order
EXPECTED_FEATURES = [
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


def test_model():
    print("Loading models and label encoder...")

    if not RISK_MODEL_PATH.exists():
        raise FileNotFoundError(f"Risk model artifact not found: {RISK_MODEL_PATH}")
    if not ENCODER_PATH.exists():
        raise FileNotFoundError(f"Label encoder artifact not found: {ENCODER_PATH}")
    if not DELAY_MODEL_PATH.exists():
        raise FileNotFoundError(f"Delay model artifact not found: {DELAY_MODEL_PATH}")

    risk_model = joblib.load(RISK_MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    delay_model = joblib.load(DELAY_MODEL_PATH)

    print("Model artifacts loaded successfully.")

    # Load processed data
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Processed dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    # Validate and isolate features strictly excluding targets ("Risk", "Delay_Days")
    target_columns = ["Risk", "Delay_Days"]
    missing_targets = [col for col in target_columns if col not in df.columns]
    if missing_targets:
        print(f"Warning: Expected target column(s) {missing_targets} not found in processed data.")

    feature_df = df.drop(columns=[col for col in target_columns if col in df.columns])

    # Enforce exact feature column ordering and detect mismatches
    missing_features = [col for col in EXPECTED_FEATURES if col not in feature_df.columns]
    if missing_features:
        raise ValueError(f"Feature mismatch: Missing required feature column(s): {missing_features}")

    extra_features = [col for col in feature_df.columns if col not in EXPECTED_FEATURES]
    if extra_features:
        raise ValueError(f"Feature mismatch: Unexpected extra column(s) in feature matrix: {extra_features}")

    X = feature_df[EXPECTED_FEATURES]

    # Use first row as test example
    sample = X.iloc[[0]]

    # 1. Test Risk Classification Model
    raw_risk_pred = risk_model.predict(sample)
    if raw_risk_pred is None or len(raw_risk_pred) == 0 or pd.isna(raw_risk_pred[0]):
        raise ValueError("Risk model returned null or NaN prediction.")

    risk_class = label_encoder.inverse_transform(raw_risk_pred)[0]
    valid_classes = list(label_encoder.classes_)
    if risk_class not in valid_classes:
        raise ValueError(f"Risk prediction '{risk_class}' not in expected classes: {valid_classes}")

    # Risk Probabilities
    risk_probabilities = risk_model.predict_proba(sample)[0]
    prob_map = dict(zip(valid_classes, [round(float(p) * 100, 1) for p in risk_probabilities]))

    # 2. Test Delay Duration Regression Model
    raw_delay_pred = delay_model.predict(sample)
    if raw_delay_pred is None or len(raw_delay_pred) == 0 or pd.isna(raw_delay_pred[0]):
        raise ValueError("Delay model returned null or NaN prediction.")

    delay_days = round(float(raw_delay_pred[0]), 2)
    if not np.isfinite(delay_days) or delay_days < 0:
        raise ValueError(f"Delay model returned invalid delay value: {delay_days}")

    print("\n--- Model Verification Results ---")
    print(f"Features tested ({len(EXPECTED_FEATURES)}): {EXPECTED_FEATURES}")
    print(f"Sample Input (Row 0):\n{sample.to_dict(orient='records')[0]}")
    print(f"\n1. Risk Classification:")
    print(f"   Predicted Risk Class: {risk_class}")
    print(f"   Class Probabilities: {prob_map}")
    print(f"\n2. Delay Duration Regression:")
    print(f"   Predicted Delay: {delay_days} days")
    print("\nAll offline model verification tests PASSED successfully.")

    return {
        "risk": risk_class,
        "delay_days": delay_days,
        "probabilities": prob_map,
    }


if __name__ == "__main__":
    test_model()