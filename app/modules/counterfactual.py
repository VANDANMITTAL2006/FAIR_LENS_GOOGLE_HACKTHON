import pandas as pd

from app.modules.attribute_detector import detect_attributes


def _resolve_prediction_column(df: pd.DataFrame) -> str | None:
    for candidate in ["y_pred", "prediction", "pred", "predicted_label"]:
        if candidate in df.columns:
            return candidate
    for candidate in ["y_true", "outcome", "label", "target", "income_binary", "two_year_recid", "action_taken"]:
        if candidate in df.columns:
            return candidate
    return None


def get_counterfactual(df: pd.DataFrame) -> dict:
    if not hasattr(df, "iloc") or len(df) == 0:
        return {"status": "cannot_compute", "reason": "empty dataset"}

    protected = detect_attributes(df)
    if not protected:
        return {"status": "cannot_compute", "reason": "no protected attribute detected"}

    pred_col = _resolve_prediction_column(df)
    if pred_col is None:
        return {"status": "cannot_compute", "reason": "prediction/outcome column missing"}

    group_col = protected[0]
    work = df[[group_col, pred_col]].copy()
    work[pred_col] = pd.to_numeric(work[pred_col], errors="coerce")
    work[group_col] = work[group_col].astype(str)
    work = work.dropna()
    if work.empty:
        return {"status": "cannot_compute", "reason": "insufficient rows after cleaning"}

    group_rates = work.groupby(group_col)[pred_col].mean().sort_values(ascending=False)
    if len(group_rates) < 2:
        return {"status": "cannot_compute", "reason": "counterfactual requires at least two groups"}

    best_group = group_rates.index[0]
    worst_group = group_rates.index[-1]
    best_rate = float(group_rates.iloc[0])
    worst_rate = float(group_rates.iloc[-1])
    delta = round((best_rate - worst_rate) * 100, 2)

    return {
        "status": "ok",
        "attribute": group_col,
        "original_group": str(worst_group),
        "counterfactual_group": str(best_group),
        "original_score": round(worst_rate * 100, 2),
        "counterfactual_score": round(best_rate * 100, 2),
        "delta": delta,
        "group_positive_rates": {str(group): round(float(rate) * 100, 2) for group, rate in group_rates.items()},
    }
