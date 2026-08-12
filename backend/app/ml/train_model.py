import pandas as pd
import joblib

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier


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
ENCODER_PATH = MODEL_DIR / "risk_label_encoder.pkl"


def train_model():

    print("Loading processed dataset...")

    df = pd.read_csv(PROCESSED_DATA)

    # Separate features and target
    X = df.drop(columns=["Risk"])
    y = df["Risk"]

    # Encode target labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    print("Risk classes:")
    for number, label in enumerate(label_encoder.classes_):
        print(f"{number} = {label}")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.2,
        random_state=42,
        stratify=y_encoded
    )

    print(f"\nTraining samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")

    # Create XGBoost model
    model = XGBClassifier(
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

    print("\nTraining XGBoost model...")

    model.fit(X_train, y_train)

    # Evaluate
    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print(f"\nModel accuracy: {accuracy:.2%}")

    print("\nClassification report:")
    print(
        classification_report(
            y_test,
            predictions,
            target_names=label_encoder.classes_,
            zero_division=0
        )
    )

    # Create model directory
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Save model
    joblib.dump(model, MODEL_PATH)

    # Save label encoder
    joblib.dump(label_encoder, ENCODER_PATH)

    print("\nModel saved to:")
    print(MODEL_PATH)

    print("\nLabel encoder saved to:")
    print(ENCODER_PATH)


if __name__ == "__main__":
    train_model()