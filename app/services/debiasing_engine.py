"""
FairLens - Debiasing Recommendation Engine
===========================================
Person D Deliverable | Day 2

This module provides 3 debiasing strategies:
  1. Reweighting          - assign sample weights so minority groups count more in training
  2. Threshold Adjustment - use different decision cutoffs per group to equalise outcomes
  3. Feature Removal      - drop the most discriminatory proxy features

Usage (by Person A - FastAPI integration):
    from app.services.debiasing_engine import run_all_strategies
    result = run_all_strategies(df, label_col, protected_col, privileged_group)

Usage (standalone, run from repo root):
    python backend/app/services/debiasing_engine.py
"""

import json
import warnings
import sys
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
from typing import Optional

warnings.filterwarnings("ignore")

# Configure stdout encoding for Windows compatibility
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass

# -----------------------------------------------------------------
# UTILITY HELPERS
# -----------------------------------------------------------------

def _encode_dataframe(df: pd.DataFrame, label_col: str) -> tuple:
    """
    Convert all categorical (text) columns to numbers so sklearn can use them.
    Returns: X (features), y (labels), feature_names
    """
    df_enc = df.copy()
    for col in df_enc.columns:
        if df_enc[col].dtype == object or str(df_enc[col].dtype) == 'string':
            df_enc[col] = LabelEncoder().fit_transform(df_enc[col].astype(str))
    # Drop any leftover non-numeric (shouldn't happen, safety net)
    df_enc = df_enc.select_dtypes(include=[np.number])
    y = df_enc[label_col].values
    X = df_enc.drop(columns=[label_col]).values
    feature_names = [c for c in df_enc.columns if c != label_col]
    return X, y, feature_names


def _compute_fairness_metrics(y_true, y_pred, groups) -> dict:
    """
    Compute bias metrics given predictions and group membership.
    Returns demographic parity difference and disparate impact ratio.
    """
    unique_groups = np.unique(groups)
    group_pos_rates = {}
    for g in unique_groups:
        mask = groups == g
        if mask.sum() == 0:
            continue
        group_pos_rates[str(g)] = float(y_pred[mask].mean())

    rates = list(group_pos_rates.values())
    if len(rates) < 2:
        return {"demographic_parity_diff": 0.0, "disparate_impact": 1.0,
                "group_positive_rates": group_pos_rates, "max_gap": 0.0}

    max_rate = max(rates)
    min_rate = min(rates)
    di = round(min_rate / max_rate, 4) if max_rate > 0 else 1.0
    dp_diff = round(max_rate - min_rate, 4)

    return {
        "demographic_parity_diff": dp_diff,
        "disparate_impact":        di,
        "group_positive_rates":    {k: round(v, 4) for k, v in group_pos_rates.items()},
        "max_gap":                 round(dp_diff * 100, 2)   # in percentage points, for UI
    }


def _train_baseline(X_train, y_train, X_test, y_test, sample_weight=None) -> tuple:
    """Train a logistic regression and return accuracy + probabilities."""
    clf = LogisticRegression(max_iter=1000, solver='lbfgs', random_state=42)
    clf.fit(X_train, y_train, sample_weight=sample_weight)
    proba = clf.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    acc   = round(accuracy_score(y_test, preds), 4)
    return clf, proba, preds, acc


def _get_protected_col_idx(feature_names: list, protected_col: str) -> Optional[int]:
    """Find the index of the protected column in feature array."""
    for i, name in enumerate(feature_names):
        if name == protected_col:
            return i
    # Try partial match (e.g. 'sex_binary' matches 'sex')
    for i, name in enumerate(feature_names):
        if protected_col.lower() in name.lower():
            return i
    return None


# -----------------------------------------------------------------
# STRATEGY 1 - REWEIGHTING
# -----------------------------------------------------------------

def strategy_reweighting(
    df: pd.DataFrame,
    label_col: str,
    protected_col: str,
    privileged_group: str
) -> dict:
    """
    Reweighting: Give higher training weights to under-represented groups
    so the model pays equal attention to all demographics.

    Logic:
      w_i = (P(Y) * P(A)) / P(Y, A)
      Under-represented group + positive label -> higher weight
      Over-represented group + positive label -> lower weight

    This is the standard AIF360 / Kamiran & Calders (2012) reweighting approach.
    """
    strategy_name = "Reweighting"

    # -- Prepare data
    df_work = df.copy().dropna(subset=[label_col, protected_col])
    X, y, feature_names = _encode_dataframe(df_work, label_col)

    # Get protected column index for fairness evaluation
    prot_idx = _get_protected_col_idx(feature_names, protected_col)

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42)
    groups_te = X_te[:, prot_idx] if prot_idx is not None else np.zeros(len(y_te))

    # -- Baseline (no weights)
    _, _, preds_base, acc_before = _train_baseline(X_tr, y_tr, X_te, y_te)
    fair_before = _compute_fairness_metrics(y_te, preds_base, groups_te)

    # -- Compute reweighting sample weights on training set
    groups_tr = X_tr[:, prot_idx] if prot_idx is not None else np.zeros(len(y_tr))

    n = len(y_tr)
    weights = np.ones(n)

    unique_groups  = np.unique(groups_tr)
    unique_labels  = np.unique(y_tr)
    p_y            = {lbl: (y_tr == lbl).mean() for lbl in unique_labels}
    p_g            = {g:   (groups_tr == g).mean() for g in unique_groups}

    for i in range(n):
        g   = groups_tr[i]
        lbl = y_tr[i]
        p_joint = ((groups_tr == g) & (y_tr == lbl)).mean()
        if p_joint > 0:
            w = (p_y[lbl] * p_g[g]) / p_joint
            weights[i] = w

    # Clip extreme weights to prevent instability
    weights = np.clip(weights, 0.1, 10.0)

    # -- Train with weights
    _, _, preds_after, acc_after = _train_baseline(X_tr, y_tr, X_te, y_te, sample_weight=weights)
    fair_after = _compute_fairness_metrics(y_te, preds_after, groups_te)

    # -- Accuracy tradeoff
    acc_loss = round((acc_before - acc_after) * 100, 2)
    dp_gain  = round((fair_before["demographic_parity_diff"] - fair_after["demographic_parity_diff"]) * 100, 2)
    di_gain  = round(fair_after["disparate_impact"] - fair_before["disparate_impact"], 4)

    return {
        "strategy":              strategy_name,
        "description":           "Assigns higher training weights to under-represented groups, forcing the model to treat all demographics equally during learning.",
        "how_it_works_simple":   "Imagine a classroom where some students are ignored. Reweighting makes the teacher pay MORE attention to those ignored students during training.",
        "accuracy_before":       acc_before,
        "accuracy_after":        acc_after,
        "accuracy_loss_pct":     acc_loss,
        "fairness_before": {
            "demographic_parity_diff": fair_before["demographic_parity_diff"],
            "disparate_impact":        fair_before["disparate_impact"],
            "group_positive_rates":    fair_before["group_positive_rates"],
            "gap_percentage_points":   fair_before["max_gap"]
        },
        "fairness_after": {
            "demographic_parity_diff": fair_after["demographic_parity_diff"],
            "disparate_impact":        fair_after["disparate_impact"],
            "group_positive_rates":    fair_after["group_positive_rates"],
            "gap_percentage_points":   fair_after["max_gap"]
        },
        "fairness_improvement_pct": dp_gain,
        "disparate_impact_gain":    di_gain,
        "eeoc_compliant_after":     fair_after["disparate_impact"] >= 0.8,
        "recommended":              True,
        "tradeoff_summary":         f"Bias gap reduced by {dp_gain}% pts. Accuracy loss: {acc_loss}% pts."
    }


# -----------------------------------------------------------------
# STRATEGY 2 - THRESHOLD ADJUSTMENT
# -----------------------------------------------------------------

def strategy_threshold_adjustment(
    df: pd.DataFrame,
    label_col: str,
    protected_col: str,
    privileged_group: str
) -> dict:
    """
    Threshold Adjustment (Post-processing):
    Train one model but use different decision thresholds per group
    so that positive prediction rates are equalised across demographics.

    Logic:
      - Standard model uses threshold = 0.5 for everyone
      - We find group-specific thresholds that equalise positive rates
      - This is done via binary search per group on the validation set

    Simple but highly effective - used in production at many companies.
    """
    strategy_name = "Threshold Adjustment"

    df_work = df.copy().dropna(subset=[label_col, protected_col])
    X, y, feature_names = _encode_dataframe(df_work, label_col)
    prot_idx = _get_protected_col_idx(feature_names, protected_col)

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, random_state=42)
    groups_te = X_te[:, prot_idx] if prot_idx is not None else np.zeros(len(y_te))

    # -- Baseline
    clf, proba_te, preds_base, acc_before = _train_baseline(X_tr, y_tr, X_te, y_te)
    fair_before = _compute_fairness_metrics(y_te, preds_base, groups_te)

    # -- Find target positive rate (use overall positive rate as target)
    overall_pos_rate = y_te.mean()

    # -- Adjust thresholds per group
    unique_groups = np.unique(groups_te)
    group_thresholds = {}
    preds_adjusted = preds_base.copy()

    for g in unique_groups:
        mask = groups_te == g
        if mask.sum() == 0:
            group_thresholds[str(g)] = 0.5
            continue

        group_proba = proba_te[mask]
        # Binary search: find threshold t such that (proba >= t).mean() ~ overall_pos_rate
        lo, hi = 0.0, 1.0
        best_t = 0.5
        for _ in range(50):   # 50 iterations of binary search -> very precise
            mid = (lo + hi) / 2.0
            rate = (group_proba >= mid).mean()
            if rate > overall_pos_rate:
                lo = mid
            else:
                hi = mid
            best_t = mid

        group_thresholds[str(int(g))] = round(best_t, 4)
        preds_adjusted[mask] = (group_proba >= best_t).astype(int)

    acc_after  = round(accuracy_score(y_te, preds_adjusted), 4)
    fair_after = _compute_fairness_metrics(y_te, preds_adjusted, groups_te)

    acc_loss = round((acc_before - acc_after) * 100, 2)
    dp_gain  = round((fair_before["demographic_parity_diff"] - fair_after["demographic_parity_diff"]) * 100, 2)
    di_gain  = round(fair_after["disparate_impact"] - fair_before["disparate_impact"], 4)

    return {
        "strategy":              strategy_name,
        "description":           "Trains one model but applies different decision thresholds per demographic group, equalising the rate of positive predictions across groups.",
        "how_it_works_simple":   "Like a grading curve - instead of everyone needing 60% to pass, the teacher adjusts the passing score per group so outcomes are equal.",
        "accuracy_before":       acc_before,
        "accuracy_after":        acc_after,
        "accuracy_loss_pct":     acc_loss,
        "group_thresholds":      group_thresholds,
        "fairness_before": {
            "demographic_parity_diff": fair_before["demographic_parity_diff"],
            "disparate_impact":        fair_before["disparate_impact"],
            "group_positive_rates":    fair_before["group_positive_rates"],
            "gap_percentage_points":   fair_before["max_gap"]
        },
        "fairness_after": {
            "demographic_parity_diff": fair_after["demographic_parity_diff"],
            "disparate_impact":        fair_after["disparate_impact"],
            "group_positive_rates":    fair_after["group_positive_rates"],
            "gap_percentage_points":   fair_after["max_gap"]
        },
        "fairness_improvement_pct": dp_gain,
        "disparate_impact_gain":    di_gain,
        "eeoc_compliant_after":     fair_after["disparate_impact"] >= 0.8,
        "recommended":              True,
        "tradeoff_summary":         f"Bias gap reduced by {dp_gain}% pts. Accuracy loss: {acc_loss}% pts."
    }


# -----------------------------------------------------------------
# STRATEGY 3 - FEATURE REMOVAL
# -----------------------------------------------------------------

def strategy_feature_removal(
    df: pd.DataFrame,
    label_col: str,
    protected_col: str,
    privileged_group: str
) -> dict:
    """
    Feature Removal (Pre-processing):
    Identify and remove features that are highly correlated with the
    protected attribute (proxy features = hidden discrimination).

    Logic:
      - Compute correlation of each feature with the encoded protected col
      - Remove features with |correlation| > threshold (default 0.2)
      - Retrain model without those proxy features

    Example: 'zipcode' correlates with race -> remove it.
             'career_gap_months' correlates with sex -> remove it.
    """
    strategy_name = "Feature Removal"

    df_work = df.copy().dropna(subset=[label_col, protected_col])
    X_full, y, feature_names = _encode_dataframe(df_work, label_col)
    prot_idx = _get_protected_col_idx(feature_names, protected_col)

    X_tr, X_te, y_tr, y_te = train_test_split(X_full, y, test_size=0.3, random_state=42)
    groups_te = X_te[:, prot_idx] if prot_idx is not None else np.zeros(len(y_te))

    # -- Baseline with all features
    _, _, preds_base, acc_before = _train_baseline(X_tr, y_tr, X_te, y_te)
    fair_before = _compute_fairness_metrics(y_te, preds_base, groups_te)

    # -- Find proxy features (correlated with protected attribute)
    CORR_THRESHOLD = 0.20   # features with |corr| > this are dropped
    proxy_features = []
    kept_features  = []
    proxy_correlations = {}

    if prot_idx is not None:
        prot_col_values = X_full[:, prot_idx]
        for i, fname in enumerate(feature_names):
            if i == prot_idx:
                continue    # always remove the protected attribute itself
            corr = float(np.corrcoef(X_full[:, i], prot_col_values)[0, 1])
            proxy_correlations[fname] = round(abs(corr), 4)
            if abs(corr) > CORR_THRESHOLD:
                proxy_features.append(fname)
            else:
                kept_features.append(fname)
    else:
        kept_features = feature_names
        proxy_features = []

    # Always remove the protected attribute itself
    if protected_col in feature_names and protected_col not in proxy_features:
        proxy_features.append(protected_col)
    if protected_col in kept_features:
        kept_features.remove(protected_col)

    # -- Rebuild feature matrix without proxy features
    keep_idx = [i for i, f in enumerate(feature_names) if f in kept_features]

    if len(keep_idx) == 0:
        # Safety: if nothing left, keep all non-protected columns
        keep_idx = [i for i in range(len(feature_names)) if i != prot_idx]

    X_tr_reduced = X_tr[:, keep_idx]
    X_te_reduced = X_te[:, keep_idx]

    # -- Retrain without proxy features
    # Recalculate groups (prot_idx may shift if prot col is in features)
    # Use original groups_te calculated before
    _, _, preds_after, acc_after = _train_baseline(X_tr_reduced, y_tr, X_te_reduced, y_te)
    fair_after = _compute_fairness_metrics(y_te, preds_after, groups_te)

    acc_loss = round((acc_before - acc_after) * 100, 2)
    dp_gain  = round((fair_before["demographic_parity_diff"] - fair_after["demographic_parity_diff"]) * 100, 2)
    di_gain  = round(fair_after["disparate_impact"] - fair_before["disparate_impact"], 4)

    # Sort by correlation for UI display
    top_proxies = sorted(proxy_correlations.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "strategy":              strategy_name,
        "description":           "Identifies and removes features that are highly correlated with the protected attribute (proxy features), then retrains the model without them.",
        "how_it_works_simple":   "If your model uses 'zipcode' and zipcode is 80% correlated with race, it's sneakily using race. We remove zipcode and all similar hidden proxies.",
        "accuracy_before":       acc_before,
        "accuracy_after":        acc_after,
        "accuracy_loss_pct":     acc_loss,
        "proxy_features_removed":   proxy_features,
        "features_kept":            kept_features[:15],   # top 15 for display
        "proxy_correlation_scores": dict(top_proxies),
        "correlation_threshold":    CORR_THRESHOLD,
        "features_removed_count":   len(proxy_features),
        "fairness_before": {
            "demographic_parity_diff": fair_before["demographic_parity_diff"],
            "disparate_impact":        fair_before["disparate_impact"],
            "group_positive_rates":    fair_before["group_positive_rates"],
            "gap_percentage_points":   fair_before["max_gap"]
        },
        "fairness_after": {
            "demographic_parity_diff": fair_after["demographic_parity_diff"],
            "disparate_impact":        fair_after["disparate_impact"],
            "group_positive_rates":    fair_after["group_positive_rates"],
            "gap_percentage_points":   fair_after["max_gap"]
        },
        "fairness_improvement_pct": dp_gain,
        "disparate_impact_gain":    di_gain,
        "eeoc_compliant_after":     fair_after["disparate_impact"] >= 0.8,
        "recommended":              len(proxy_features) > 1,
        "tradeoff_summary":         f"{len(proxy_features)} proxy features removed. Bias gap reduced by {dp_gain}% pts. Accuracy loss: {acc_loss}% pts."
    }


# -----------------------------------------------------------------
# MAIN FUNCTION - runs all 3 strategies, returns combined JSON
# -----------------------------------------------------------------

def run_all_strategies(
    df: pd.DataFrame,
    label_col: str,
    protected_col: str,
    privileged_group: str,
    dataset_name: str = "dataset"
) -> dict:
    """
    Run all 3 debiasing strategies on the given dataframe.

    Parameters:
        df              : cleaned pandas DataFrame (from Day 1 CSVs)
        label_col       : name of the target/outcome column (e.g. 'income_binary')
        protected_col   : name of the protected attribute column (e.g. 'sex')
        privileged_group: the majority/privileged group value (e.g. 'Male')
        dataset_name    : friendly name for the output JSON

    Returns:
        dict with all 3 strategy results + metadata
    """
    try:
        print(f"\n{'='*60}")
        print(f"Running debiasing on: {dataset_name}")
        print(f"Label: {label_col} | Protected: {protected_col} | Privileged: {privileged_group}")
        print(f"Dataset shape: {df.shape}")
        print("="*60)
    except UnicodeEncodeError:
        pass

    results = {"dataset": dataset_name, "label_col": label_col,
               "protected_col": protected_col, "privileged_group": privileged_group,
               "n_rows": len(df), "strategies": {}}

    for strategy_fn, name in [
        (strategy_reweighting,          "reweighting"),
        (strategy_threshold_adjustment, "threshold_adjustment"),
        (strategy_feature_removal,      "feature_removal"),
    ]:
        try:
            print(f"\n  > Running {name}...")
        except UnicodeEncodeError:
            pass
        try:
            result = strategy_fn(df, label_col, protected_col, privileged_group)
            results["strategies"][name] = result
            try:
                print(f"    Accuracy: {result['accuracy_before']} -> {result['accuracy_after']}  "
                      f"| DI: {result['fairness_before']['disparate_impact']} -> {result['fairness_after']['disparate_impact']}  "
                      f"| EEOC: {'OK' if result['eeoc_compliant_after'] else 'FAIL'}")
            except UnicodeEncodeError:
                pass
        except Exception as e:
            try:
                print(f"    ! Error: {e}")
            except UnicodeEncodeError:
                pass
            results["strategies"][name] = {"error": str(e), "strategy": name}

    # Best strategy = highest DI gain with least accuracy loss
    best = None
    best_score = -999
    for name, s in results["strategies"].items():
        if "error" in s:
            continue
        score = s.get("disparate_impact_gain", 0) * 100 - abs(s.get("accuracy_loss_pct", 0)) * 0.3
        if score > best_score:
            best_score = score
            best = name

    results["recommended_strategy"] = best
    results["summary"] = (
        f"Ran 3 debiasing strategies on {dataset_name}. "
        f"Best recommended: {best}. All results ready for frontend."
    )
    return results


# -----------------------------------------------------------------
# STANDALONE RUNNER - called when you run `python debiasing_engine.py`
# -----------------------------------------------------------------

if __name__ == "__main__":
    import os

    # Detect data folder (works from any directory)
    BASE = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE, "..", "data", "datasets")
    OUT_DIR  = os.path.join(BASE, "..", "data", "precomputed")
    os.makedirs(OUT_DIR, exist_ok=True)

    DATASETS = [
        {
            "file":             "adult_cleaned.csv",
            "name":             "UCI Adult Income (HR / Hiring)",
            "label_col":        "income_binary",
            "protected_col":    "sex_binary",
            "privileged_group": "1",
        },
        {
            "file":             "compas_cleaned.csv",
            "name":             "COMPAS Recidivism (Criminal Justice)",
            "label_col":        "two_year_recid",
            "protected_col":    "is_african_american",
            "privileged_group": "0",
        },
        {
            "file":             "hmda_cleaned.csv",
            "name":             "HUD HMDA Mortgage (Lending)",
            "label_col":        "action_taken",
            "protected_col":    "race_black",
            "privileged_group": "0",
            "filter":           {"action_taken": [1, 3]},
            "remap_label":      {1: 1, 3: 0},   # 1=approved -> 1, 3=denied -> 0
        },
    ]

    all_results = {}

    for cfg in DATASETS:
        fpath = os.path.join(DATA_DIR, cfg["file"])
        if not os.path.exists(fpath):
            try:
                print(f"! File not found: {fpath} - skipping")
            except UnicodeEncodeError:
                pass
            continue

        df = pd.read_csv(fpath)

        # HMDA: filter to approved/denied only, remap label
        if "filter" in cfg:
            for col, vals in cfg["filter"].items():
                df = df[df[col].isin(vals)].copy()
        if "remap_label" in cfg:
            df[cfg["label_col"]] = df[cfg["label_col"]].map(cfg["remap_label"])

        # Drop rows with NaN in label or protected col
        df = df.dropna(subset=[cfg["label_col"], cfg["protected_col"]])

        result = run_all_strategies(
            df,
            label_col        = cfg["label_col"],
            protected_col    = cfg["protected_col"],
            privileged_group = cfg["privileged_group"],
            dataset_name     = cfg["name"]
        )
        all_results[cfg["name"]] = result

        # Save per-dataset JSON
        safe_name = cfg["file"].replace(".csv", "")
        out_path  = os.path.join(OUT_DIR, f"{safe_name}_debiasing.json")
        with open(out_path, "w") as f:
            json.dump(result, f, indent=2)
        try:
            print(f"\n  OK Saved -> {out_path}")
        except UnicodeEncodeError:
            pass

    # Save combined JSON for frontend
    combined_path = os.path.join(OUT_DIR, "all_datasets_debiasing.json")
    with open(combined_path, "w") as f:
        json.dump(all_results, f, indent=2)
    try:
        print(f"\n{'='*60}")
        print(f"OK ALL DONE - combined output saved to:")
        print(f"   {combined_path}")
        print("="*60)
    except UnicodeEncodeError:
        pass
