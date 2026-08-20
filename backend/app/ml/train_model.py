import pandas as pd
import joblib

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error, r2_score
from xgboost import XGBClassifier, XGBRegressor


# Project paths
BASE_DIR = Path(__file__).resolve().parents[3]

PROCESSED_DATA = (
    BASE_DIR
    / "data"
    / "processed"
    / "processed_supply_chain_data.csv"
)

MODEL_DIR = BASE_DIR / "data" / "models"
MODEL_PATH = MODEL_DIR / "supply_chain_risk_model.pkl"
DELAY_MODEL_PATH = MODEL_DIR / "supply_chain_delay_model.pkl"
ENCODER_PATH = MODEL_DIR / "risk_label_encoder.pkl"


def train_model():

    print("Loading processed dataset...")

    df = pd.read_csv(PROCESSED_DATA)

    # Separate features and targets
    X = df.drop(columns=["Risk", "Delay_Days"])
    y_risk = df["Risk"]
    y_delay = df["Delay_Days"]

    # Encode target labels for Risk
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y_risk)

    print("Risk classes:")
    for number, label in enumerate(label_encoder.classes_):
        print(f"{number} = {label}")

    # Split data
    X_train, X_test, y_train_risk, y_test_risk, y_train_delay, y_test_delay = train_test_split(
        X,
        y_encoded,
        y_delay,
        test_size=0.2,
        random_state=42,
        stratify=y_encoded
    )

    print(f"\nTraining samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")

    # 1. Train XGBoost Risk Classifier
    print("\nTraining XGBoost Risk Classifier...")
    risk_model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="multi:softmax",
        num_class=len(label_encoder.classes_),
        eval_metric="mlogloss",
        random_state=42
    )
    risk_model.fit(X_train, y_train_risk)

    # Evaluate Risk Classifier
    risk_preds = risk_model.predict(X_test)
    accuracy = accuracy_score(y_test_risk, risk_preds)
    print(f"Risk Model accuracy: {accuracy:.2%}")
    print("\nClassification report:")
    print(
        classification_report(
            y_test_risk,
            risk_preds,
            target_names=label_encoder.classes_,
            zero_division=0
        )
    )

    # 2. Train XGBoost Delay Regressor
    print("\nTraining XGBoost Delay Regressor...")
    delay_model = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    delay_model.fit(X_train, y_train_delay)

    # Evaluate Delay Regressor
    delay_preds = delay_model.predict(X_test)
    mae = mean_absolute_error(y_test_delay, delay_preds)
    r2 = r2_score(y_test_delay, delay_preds)
    print(f"Delay Model MAE: {mae:.2f} days")
    print(f"Delay Model R² score: {r2:.2%}")

    # Save models and encoder
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(risk_model, MODEL_PATH)
    joblib.dump(delay_model, DELAY_MODEL_PATH)
    joblib.dump(label_encoder, ENCODER_PATH)

    print("\nModels and label encoder saved successfully.")


if __name__ == "__main__":
    train_model()