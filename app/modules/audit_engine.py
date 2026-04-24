import pandas as pd
from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference
from sklearn.metrics import precision_score
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import cross_val_predict
import logging
from app.modules.attribute_detector import detect_attributes

logger = logging.getLogger(__name__)


def _encode_for_model(df: pd.DataFrame, target_col: str) -> tuple[pd.DataFrame, pd.Series]:
    df_work = df.copy()
    for col in df_work.columns:
        if col == target_col:
            continue
        if df_work[col].dtype == object or str(df_work[col].dtype).startswith("string"):
            df_work[col] = LabelEncoder().fit_transform(df_work[col].astype(str))

    numeric = df_work.select_dtypes(include=["number"]).dropna()
    if target_col not in numeric.columns:
        raise ValueError(f"target column '{target_col}' is not numeric after encoding")

    y = numeric[target_col].astype(int)
    X = numeric.drop(columns=[target_col])
    if X.empty:
        raise ValueError("cannot derive y_pred from real data: no usable feature columns")

    return X, y


def _binarize(series: pd.Series) -> pd.Series:
    """Map any numeric label column to {0, 1}.

    Rules (applied in order):
      1. Already {0, 1}  → return as-is
      2. {-1, 1}         → map -1→0
      3. {1, 2}          → map 2→0 (COMPAS-style: 1=recid, 2=no recid)
      4. Any other        → median-split (>= median → 1, else 0)
    """
    vals = set(series.dropna().unique())
    if vals <= {0, 1}:
        return series
    if vals <= {-1, 1}:
        return series.map({-1: 0, 1: 1})
    if vals <= {1, 2}:
        return series.map({1: 1, 2: 0})
    # General fallback: binarize by median
    median = series.median()
    return (series >= median).astype(int)


def _resolve_y_true(df: pd.DataFrame) -> pd.Series:
    for candidate in ["y_true", "outcome", "label", "target", "income_binary", "two_year_recid", "action_taken"]:
        if candidate in df.columns:
            raw = pd.to_numeric(df[candidate], errors="coerce")
            return _binarize(raw)
    raise ValueError("cannot compute fairness metrics: missing y_true/outcome label column")


def _resolve_y_pred(df: pd.DataFrame, y_true: pd.Series) -> pd.Series:
    for candidate in ["y_pred", "prediction", "pred", "predicted_label"]:
        if candidate in df.columns:
            raw = pd.to_numeric(df[candidate], errors="coerce")
            return _binarize(raw)

    target_col = y_true.name or "y_true"
    if target_col not in df.columns:
        df = df.copy()
        df[target_col] = y_true

    X, y = _encode_for_model(df, target_col)
    
    # Use cross_val_predict to avoid training/testing on same data which masks bias
    model = LogisticRegression(max_iter=1000, solver="lbfgs", random_state=42)
    preds = cross_val_predict(model, X, y, cv=5)
    
    return pd.Series(preds, index=X.index, name="y_pred")


def _pick_best_protected(df: pd.DataFrame, protected_cols: list[str]) -> str | None:
    """Pick the most suitable protected attribute for fairness analysis.

    Prefers low-cardinality categorical columns (sex, race, gender) over
    high-cardinality numeric columns (age, zipcode) which produce
    meaningless group comparisons.
    """
    if not protected_cols:
        return None

    # Preference tiers: categorical names that usually have 2-5 groups
    PREFERRED = ["sex", "gender", "race", "ethnicity"]

    # Score each candidate: lower = better
    scored = []
    for col in protected_cols:
        nunique = df[col].nunique()
        # Use substring matching for preferred status (e.g., 'applicant_sex' contains 'sex')
        is_preferred = any(p in col.lower() for p in PREFERRED)
        is_categorical = df[col].dtype == object or str(df[col].dtype).startswith("string")
        
        # Best: preferred + categorical + low cardinality
        # Worst: high cardinality numeric (e.g. age with 50 unique values)
        score = (
            0 if is_preferred else 1,          # prefer known categorical names
            0 if is_categorical else 1,         # prefer string dtype
            0 if 2 <= nunique <= 10 else 1,     # prefer 2-10 groups
            nunique,                            # tie-break: fewer groups
        )
        scored.append((score, col))

    scored.sort()
    return scored[0][1]


def audit(df: pd.DataFrame) -> dict:
    try:
        protected_cols = detect_attributes(df)
        primary_protected = _pick_best_protected(df, protected_cols)

        y_true = _resolve_y_true(df)
        y_pred = _resolve_y_pred(df, y_true)

        aligned = pd.DataFrame({"y_true": y_true, "y_pred": y_pred}).dropna()
        if aligned.empty:
            return {
                "success": False,
                "error": "cannot compute fairness metrics: y_true/y_pred resolved to empty values",
                "protected_attributes": protected_cols
            }

        y_true = _binarize(aligned["y_true"]).astype(int)
        y_pred = _binarize(aligned["y_pred"]).astype(int)

        metrics = {
            "demographic_parity_difference": 0.0,
            "equalized_odds_difference": 0.0,
            "predictive_parity_diff": 0.0,
            "disparate_impact_ratio": 1.0,
        }
        group_metrics = {}

        if not primary_protected or primary_protected not in df.columns:
            return {
                "success": False,
                "error": "cannot compute fairness metrics: no protected attribute column detected",
                "protected_attributes": protected_cols
            }

        sensitive_features = df.loc[aligned.index, primary_protected].fillna("Unknown").astype(str)
        metrics["demographic_parity_difference"] = float(
            demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive_features)
        )
        metrics["equalized_odds_difference"] = float(
            equalized_odds_difference(y_true, y_pred, sensitive_features=sensitive_features)
        )

        groups = sensitive_features.unique()
        rates = {}
        precisions = []

        for g in groups:
            mask = sensitive_features == g
            size = int(mask.sum())
            if size > 0:
                sr = float(y_pred[mask].mean())
                rates[g] = sr
                group_metrics[g] = {"selection_rate": round(sr, 4), "sample_size": size}

                if y_pred[mask].sum() > 0:
                    precisions.append(precision_score(y_true[mask], y_pred[mask], pos_label=1, zero_division=0))

        if rates:
            max_rate = max(rates.values())
            min_rate = min(rates.values())
            metrics["disparate_impact_ratio"] = float(min_rate / max_rate) if max_rate > 0 else 1.0

        if precisions:
            metrics["predictive_parity_diff"] = float(max(precisions) - min(precisions))

        logger.info(f"[AUDIT] Calculated raw metrics: {metrics}")
        logger.info(f"[AUDIT] Primary protected attribute: {primary_protected}")

        di = metrics.get("disparate_impact_ratio", 1.0)
        risk_level = "High" if di < 0.8 else "Low"
        summary = f"Model shows {risk_level.lower()} risk. Disparate impact is {di:.2f}."
        
        return {
            "success": True,
            "dataset_name": "uploaded_file",
            "protected_attributes": protected_cols,
            "primary_protected": primary_protected,
            "metrics": metrics,
            "group_metrics": group_metrics,
            "risk_level": risk_level,
            "plain_english_summary": summary
        }
    except Exception as e:
        logger.error(f"Audit failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "protected_attributes": []
        }
