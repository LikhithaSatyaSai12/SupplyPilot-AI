import pandas as pd
from pathlib import Path


# Project paths
BASE_DIR = Path(__file__).resolve().parents[3]

RAW_DATA = BASE_DIR / "data" / "raw" / "supply_chain_data.csv"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DATA = PROCESSED_DIR / "processed_supply_chain_data.csv"


def create_risk_label(row):
    """
    Create a supply-chain risk label from
    lead time, defect rate and stock level.
    """

    score = 0

    # Higher lead time increases risk
    if row["Lead time"] > 15:
        score += 2
    elif row["Lead time"] > 8:
        score += 1

    # Higher defect rate increases risk
    if row["Defect rates"] > 3:
        score += 2
    elif row["Defect rates"] > 1.5:
        score += 1

    # Lower stock availability increases risk
    if row["Stock levels"] < 30:
        score += 2
    elif row["Stock levels"] < 60:
        score += 1

    if score >= 4:
        return "High"
    elif score >= 2:
        return "Medium"
    else:
        return "Low"


def preprocess_data():
    print("Loading raw dataset...")

    df = pd.read_csv(RAW_DATA)

    print(f"Loaded {len(df)} rows and {len(df.columns)} columns.")

    # Create target variable
    df["Risk"] = df.apply(create_risk_label, axis=1)

    # Select useful ML features
    selected_columns = [
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
        "Risk",
    ]

    processed_df = df[selected_columns].copy()

    # Create processed directory
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # Save processed dataset
    processed_df.to_csv(PROCESSED_DATA, index=False)

    print("Preprocessing completed.")
    print(f"Processed dataset saved to: {PROCESSED_DATA}")
    print("\nRisk distribution:")
    print(processed_df["Risk"].value_counts())


if __name__ == "__main__":
    preprocess_data()