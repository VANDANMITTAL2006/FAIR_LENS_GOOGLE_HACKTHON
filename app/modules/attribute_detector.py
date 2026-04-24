import pandas as pd
import logging

logger = logging.getLogger(__name__)

POSSIBLE_PROTECTED = [
    "sex", "gender", "male", "female",
    "race", "ethnicity",
    "age",
    "applicant_sex", "applicant_race",
    "borrower_race", "borrower_sex",
    "zipcode", "zip_code",
    "nationality", "marital_status"
]

KNOWN_PROTECTED = POSSIBLE_PROTECTED


def detect_attributes(df: pd.DataFrame) -> list[str]:
    """Detect potential protected attributes based on column names and data types."""
    print(f"[DEBUG] All columns in dataset: {list(df.columns)}")
    
    # 1. Name-based detection (Flexible substring matching)
    protected_columns = [
        col for col in df.columns
        if any(key in col.lower() for key in POSSIBLE_PROTECTED)
    ]
    
    # 2. Smart Fallback (Critical for Demo): If no protected column is detected
    if not protected_columns:
        print("[DEBUG] No protected attributes found by name. Triggering smart fallback...")
        for col in df.columns:
            # Skip likely target columns
            if col.lower() in ["y", "target", "label", "outcome", "action_taken"]:
                continue
                
            nunique = df[col].nunique()
            # Pick a column with low unique values (2-10) which is often a categorical/protected attribute
            if 2 <= nunique <= 10:
                print(f"[DEBUG] Fallback: picked '{col}' (nunique={nunique}) as potential protected attribute")
                protected_columns = [col]
                break
    
    print(f"[DEBUG] Detected protected attributes: {protected_columns}")
    return protected_columns
