import os
import shutil
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Tuple, List, Dict, Any
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from xgboost import XGBClassifier, XGBRegressor

from app.database import SessionLocal
from app.models import ModelRetraining, ExecutionOutcome
from app.ml.preprocess import preprocess_data
from app.services.ml_service import reload_ml_models

# Project paths
BASE_DIR = Path(__file__).resolve().parents[3]
RAW_DATA = BASE_DIR / "data" / "raw" / "supply_chain_data.csv"
PROCESSED_DATA = BASE_DIR / "data" / "processed" / "processed_supply_chain_data.csv"
MODEL_DIR = BASE_DIR / "data" / "models"

MODEL_PATH = MODEL_DIR / "supply_chain_risk_model.pkl"
DELAY_MODEL_PATH = MODEL_DIR / "supply_chain_delay_model.pkl"
ENCODER_PATH = MODEL_DIR / "risk_label_encoder.pkl"

STAGING_MODEL_PATH = MODEL_DIR / "staging_risk_model.pkl"
STAGING_DELAY_PATH = MODEL_DIR / "staging_delay_model.pkl"
STAGING_ENCODER_PATH = MODEL_DIR / "staging_label_encoder.pkl"

# Exact 15 features in training order
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

# Retraining Configurable Discrepancy Thresholds
RETRAIN_DELIVERY_THRESHOLD_DAYS = 3.0
RETRAIN_COST_VARIANCE_PERCENT = 0.20
RETRAIN_COST_VARIANCE_MIN_USD = 3000.0
RETRAIN_RISK_MISMATCH = True

# Thread lock for concurrency control
training_lock = threading.Lock()
is_training = False
active_model_version = "v1.0.0"
last_retrain_status = {
    "status": "IDLE",
    "active_version": "v1.0.0",
    "last_run_at": None,
    "last_risk_accuracy": None,
    "last_delay_mae": None,
    "error_message": None,
}


def check_discrepancy_trigger(
    actual_cost: float,
    expected_cost: float,
    actual_days: int,
    expected_days: int,
    actual_risk: str,
    expected_risk: str,
) -> Tuple[bool, str]:
    """
    Check whether an execution outcome exceeds configurable discrepancy thresholds.
    Returns (should_retrain, reason_description).
    """
    reasons = []

    # 1. Delivery variance threshold check
    deliv_var = abs(actual_days - expected_days)
    if deliv_var >= RETRAIN_DELIVERY_THRESHOLD_DAYS:
        reasons.append(f"Delivery variance ({deliv_var}d) >= threshold ({RETRAIN_DELIVERY_THRESHOLD_DAYS}d)")

    # 2. Cost variance threshold check
    cost_var = abs(actual_cost - expected_cost)
    if expected_cost > 0:
        cost_pct = cost_var / expected_cost
        if cost_pct >= RETRAIN_COST_VARIANCE_PERCENT or cost_var >= RETRAIN_COST_VARIANCE_MIN_USD:
            reasons.append(f"Cost variance (${cost_var:,.2f}, {cost_pct:.1%}) exceeds threshold")

    # 3. Risk mismatch check
    if RETRAIN_RISK_MISMATCH and actual_risk.strip().lower() != expected_risk.strip().lower():
        reasons.append(f"Risk mismatch (Expected: {expected_risk}, Actual: {actual_risk})")

    if reasons:
        return True, " | ".join(reasons)
    return False, "No significant discrepancy detected"


def ingest_execution_outcomes(
    base_df: pd.DataFrame,
    db_session,
    raw_df: pd.DataFrame,
) -> Tuple[pd.DataFrame, int, int]:
    """
    Query ExecutionOutcome records from the database, validate each record,
    safely map features using supplier baseline data, and append to the training set.
    
    Returns:
        (augmented_df, total_db_count, valid_incorporated_count)
    """
    if db_session is None:
        return base_df.copy(), 0, 0

    try:
        outcomes = db_session.query(ExecutionOutcome).all()
    except Exception as e:
        print(f"Warning: Could not fetch execution outcomes for retraining: {e}")
        return base_df.copy(), 0, 0

    total_db_count = len(outcomes)
    if total_db_count == 0:
        return base_df.copy(), 0, 0

    valid_rows = []
    seen_outcome_ids = set()

    for outcome in outcomes:
        # Deduplication check
        if outcome.id in seen_outcome_ids:
            continue
        seen_outcome_ids.add(outcome.id)

        # Validation: Check for required non-null attributes
        if not outcome.supplier or outcome.quantity is None or outcome.quantity <= 0:
            continue

        if not outcome.actual_risk or str(outcome.actual_risk).capitalize() not in ["Low", "Medium", "High"]:
            continue

        if outcome.actual_days is None or outcome.actual_days < 0:
            continue

        # Look up baseline supplier row from raw dataset
        sup_name = str(outcome.supplier).strip().lower()
        matching = raw_df[
            raw_df["Supplier name"].astype(str).str.strip().str.lower() == sup_name
        ]
        if matching.empty:
            # If exact supplier name not in raw dataset, fallback to first row as template
            sup_row = raw_df.iloc[0]
        else:
            sup_row = matching.iloc[0]

        try:
            row_dict = {
                "Price": float(sup_row.get("Price", 50.0)),
                "Availability": float(sup_row.get("Availability", 50.0)),
                "Number of products sold": float(sup_row.get("Number of products sold", 500.0)),
                "Revenue generated": float(sup_row.get("Revenue generated", 5000.0)),
                "Stock levels": float(sup_row.get("Stock levels", 50.0)),
                "Lead times": float(sup_row.get("Lead times", 10.0)),
                "Order quantities": float(outcome.quantity),
                "Shipping times": float(sup_row.get("Shipping times", 5.0)),
                "Shipping costs": float(sup_row.get("Shipping costs", 5.0)),
                "Lead time": float(sup_row.get("Lead time", 15.0)),
                "Production volumes": float(sup_row.get("Production volumes", 500.0)),
                "Manufacturing lead time": float(sup_row.get("Manufacturing lead time", 15.0)),
                "Manufacturing costs": float(sup_row.get("Manufacturing costs", 30.0)),
                "Defect rates": float(sup_row.get("Defect rates", 1.0)),
                "Costs": float(sup_row.get("Costs", 100.0)),
                "Risk": str(outcome.actual_risk).strip().capitalize(),
                "Delay_Days": float(outcome.actual_days),
            }
            valid_rows.append(row_dict)
        except Exception as parse_err:
            print(f"Warning: Skipping malformed outcome record #{outcome.id}: {parse_err}")
            continue

    valid_count = len(valid_rows)
    if valid_count > 0:
        new_df = pd.DataFrame(valid_rows)
        augmented_df = pd.concat([base_df, new_df], ignore_index=True)
    else:
        augmented_df = base_df.copy()

    return augmented_df, total_db_count, valid_count


def run_retraining_pipeline(trigger_reason: str = "MANUAL_API") -> dict:
    """
    Executes the automated retraining pipeline with database outcome ingestion,
    thread lock, staging validation, atomic artifact replacement, and database logging.
    """
    global is_training, active_model_version, last_retrain_status

    if not training_lock.acquire(blocking=False):
        return {
            "status": "TRAINING_IN_PROGRESS",
            "message": "Retraining is already running in another thread.",
            "active_version": active_model_version,
        }

    is_training = True
    start_time = datetime.now()
    started_at_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
    version_id = f"v1.{int(start_time.timestamp())}"

    # Log start to database
    db = SessionLocal()
    retrain_record = ModelRetraining(
        started_at=started_at_str,
        status="IN_PROGRESS",
        trigger_reason=trigger_reason,
        number_of_records=0,
        model_version=version_id,
    )
    db.add(retrain_record)
    db.commit()
    db.refresh(retrain_record)

    last_retrain_status["status"] = "TRAINING"
    last_retrain_status["last_run_at"] = started_at_str

    try:
        # Step 1: Preprocess base static dataset
        preprocess_data()
        base_df = pd.read_csv(PROCESSED_DATA)
        raw_df = pd.read_csv(RAW_DATA) if RAW_DATA.exists() else base_df

        # Step 2: Ingest closed-loop execution outcomes from database
        augmented_df, db_outcome_count, valid_incorporated_count = ingest_execution_outcomes(
            base_df=base_df,
            db_session=db,
            raw_df=raw_df,
        )

        num_records = len(augmented_df)

        print("\n--- Retraining Dataset Ingestion Report ---")
        print(f"Base dataset record count:           {len(base_df)}")
        print(f"Database outcome count:              {db_outcome_count}")
        print(f"Valid outcome records incorporated:  {valid_incorporated_count}")
        print(f"Final training dataset count:        {num_records}")
        print("-------------------------------------------\n")

        # Step 3: Prepare features and targets
        X = augmented_df[EXPECTED_FEATURES]
        y_risk = augmented_df["Risk"]
        y_delay = augmented_df["Delay_Days"]

        label_encoder = LabelEncoder()
        # Ensure encoder knows all standard classes ["High", "Low", "Medium"]
        label_encoder.fit(["High", "Low", "Medium"])
        y_encoded = label_encoder.transform(y_risk)

        X_train, X_test, y_train_risk, y_test_risk, y_train_delay, y_test_delay = train_test_split(
            X, y_encoded, y_delay, test_size=0.2, random_state=42, stratify=y_encoded
        )

        # Step 4: Train staging models
        staging_risk_model = XGBClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.1, subsample=0.8,
            colsample_bytree=0.8, objective="multi:softmax", num_class=len(label_encoder.classes_),
            eval_metric="mlogloss", random_state=42
        )
        staging_risk_model.fit(X_train, y_train_risk)
        risk_preds = staging_risk_model.predict(X_test)
        accuracy = float(accuracy_score(y_test_risk, risk_preds))

        staging_delay_model = XGBRegressor(
            n_estimators=100, max_depth=4, learning_rate=0.1, subsample=0.8,
            colsample_bytree=0.8, random_state=42
        )
        staging_delay_model.fit(X_train, y_train_delay)
        delay_preds = staging_delay_model.predict(X_test)
        mae = float(mean_absolute_error(y_test_delay, delay_preds))

        # Save to staging paths first
        joblib.dump(staging_risk_model, STAGING_MODEL_PATH)
        joblib.dump(staging_delay_model, STAGING_DELAY_PATH)
        joblib.dump(label_encoder, STAGING_ENCODER_PATH)

        # Step 5: Validate staging artifacts
        test_risk = joblib.load(STAGING_MODEL_PATH)
        test_delay = joblib.load(STAGING_DELAY_PATH)
        sample_pred = test_risk.predict(X_test.iloc[[0]])
        sample_delay = test_delay.predict(X_test.iloc[[0]])

        if sample_pred is None or sample_delay is None or pd.isna(sample_delay[0]):
            raise ValueError("Staging model validation failed: generated NaN or null prediction.")

        # Step 6: Atomic replacement of active model artifacts
        shutil.copyfile(STAGING_MODEL_PATH, MODEL_PATH)
        shutil.copyfile(STAGING_DELAY_PATH, DELAY_MODEL_PATH)
        shutil.copyfile(STAGING_ENCODER_PATH, ENCODER_PATH)

        # Clean staging files
        for p in [STAGING_MODEL_PATH, STAGING_DELAY_PATH, STAGING_ENCODER_PATH]:
            if p.exists():
                p.unlink()

        # Step 7: Live reload models in ml_service
        active_model_version = version_id
        reload_ml_models()

        # Step 8: Update database log
        completed_at_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        retrain_record.completed_at = completed_at_str
        retrain_record.status = "SUCCESS"
        retrain_record.number_of_records = num_records
        retrain_record.risk_accuracy = round(accuracy * 100, 2)
        retrain_record.delay_mae = round(mae, 2)
        db.commit()

        last_retrain_status.update({
            "status": "SUCCESS",
            "active_version": active_model_version,
            "last_run_at": completed_at_str,
            "last_risk_accuracy": round(accuracy * 100, 2),
            "last_delay_mae": round(mae, 2),
            "error_message": None,
        })

        return {
            "status": "SUCCESS",
            "message": "Model retraining and validation completed successfully.",
            "model_version": active_model_version,
            "risk_accuracy_pct": round(accuracy * 100, 2),
            "delay_mae_days": round(mae, 2),
            "training_samples": len(X_train),
            "base_records": len(base_df),
            "database_outcomes": db_outcome_count,
            "incorporated_outcomes": valid_incorporated_count,
            "total_records": num_records,
        }

    except Exception as err:
        err_msg = str(err)
        completed_at_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        retrain_record.completed_at = completed_at_str
        retrain_record.status = "FAILED"
        retrain_record.error_message = err_msg
        db.commit()

        last_retrain_status.update({
            "status": "FAILED",
            "last_run_at": completed_at_str,
            "error_message": err_msg,
        })

        return {
            "status": "FAILED",
            "message": f"Model retraining failed: {err_msg}",
            "active_version": active_model_version,  # Previous model remains active!
        }

    finally:
        db.close()
        is_training = False
        training_lock.release()


def get_active_version() -> str:
    return active_model_version


def get_retrain_status() -> dict:
    return last_retrain_status

