import pandas as pd
import joblib

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]

MODEL_PATH = BASE_DIR / "data" / "models" / "supply_chain_risk_model.pkl"
ENCODER_PATH = BASE_DIR / "data" / "models" / "risk_label_encoder.pkl"
DATA_PATH = BASE_DIR / "data" / "processed" / "processed_supply_chain_data.csv"


def test_model():

    print("Loading model...")

    model = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)

    print("Model loaded successfully.")

    # Load processed data
    df = pd.read_csv(DATA_PATH)

    # Remove target column
    X = df.drop(columns=["Risk"])

    # Use the first row as a test example
    sample = X.iloc[[0]]

    prediction = model.predict(sample)

    risk = label_encoder.inverse_transform(prediction)[0]

    print("\nTest prediction:")
    print(f"Predicted risk: {risk}")

    print("\nModel verification successful.")


if __name__ == "__main__":
    test_model()