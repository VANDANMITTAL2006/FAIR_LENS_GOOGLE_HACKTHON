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
    # 1. Name-based detection (flexible substring matching)
    protected_columns = [
        col for col in df.columns
        if any(key in col.lower() for key in POSSIBLE_PROTECTED)
    ]

    # 2. Smart fallback: if no protected column detected, pick low-cardinality column
    if not protected_columns:
        logger.debug("No protected attributes found by name. Triggering smart fallback.")
        for col in df.columns:
            if col.lower() in ["y", "target", "label", "outcome", "action_taken"]:
                continue
            nunique = df[col].nunique()
            if 2 <= nunique <= 10:
                logger.debug(f"Fallback: picked '{col}' (nunique={nunique})")
                protected_columns = [col]
                break

    logger.debug(f"Detected protected attributes: {protected_columns}")
    return protected_columns
