import json
from pathlib import Path

import pandas as pd

from app.config.paths import CACHED_PREFIX, DATA_DIR, DATASETS
from app.modules.audit_engine import audit
from app.modules.counterfactual import get_counterfactual
from app.modules.regulatory_radar import get_violations
from app.modules.shap_explainer import explain


METRIC_DEFAULTS = {
    "demographic_parity_difference": 0.0,
    "equalized_odds_difference": 0.0,
    "predictive_parity_diff": 0.0,
    "disparate_impact_ratio": 1.0,
}


def _base_contract(dataset_name: str = "uploaded_file") -> dict:
    return {
        "status": "failed",
        "dataset_name": dataset_name,
        "protected_attributes": [],
        "risk_level": "Unknown",
        "plain_english_summary": "",
        "metrics": METRIC_DEFAULTS.copy(),
        "group_metrics": {},
        "disparate_impact": 1.0,
        "statistical_parity_diff": 0.0,
        "equalized_odds_diff": 0.0,
        "predictive_parity_diff": 0.0,
        "eeoc_threshold_breach": False,
        "top_shap_features": [],
        "group_difference_summary": "",
        "counterfactual": {},
        "regulatory_violations": [],
        "component_status": {
            "audit": "failed",
            "shap": "skipped",
            "counterfactual": "skipped",
            "regulatory": "skipped",
            "cache": "miss",
        },
        "mode": {"cached": False, "fast": False},
        "warnings": [],
    }


def _as_float(value, default: float) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _validate_audit_result(raw: object, contract: dict) -> bool:
    warnings = contract["warnings"]

    if not isinstance(raw, dict):
        warnings.append("audit() returned non-dict output; fallback defaults used")
        return False

    contract["dataset_name"] = str(raw.get("dataset_name") or contract["dataset_name"])

    protected = raw.get("protected_attributes", [])
    if isinstance(protected, list):
        contract["protected_attributes"] = protected
    else:
        warnings.append("audit.protected_attributes invalid; default [] used")

    metrics = raw.get("metrics", {})
    if not isinstance(metrics, dict):
        warnings.append("audit.metrics invalid; default metric values used")
        metrics = {}

    validated_metrics = {}
    for key, default in METRIC_DEFAULTS.items():
        validated_metrics[key] = _as_float(metrics.get(key, default), default)

    group_metrics = raw.get("group_metrics", {})
    if not isinstance(group_metrics, dict):
        warnings.append("audit.group_metrics invalid; default {} used")
        group_metrics = {}

    contract["metrics"] = validated_metrics
    contract["group_metrics"] = group_metrics
    contract["risk_level"] = str(raw.get("risk_level") or "Unknown")
    contract["plain_english_summary"] = str(raw.get("plain_english_summary") or "")

    contract["disparate_impact"] = validated_metrics["disparate_impact_ratio"]
    contract["statistical_parity_diff"] = validated_metrics["demographic_parity_difference"]
    contract["equalized_odds_diff"] = validated_metrics["equalized_odds_difference"]
    contract["predictive_parity_diff"] = validated_metrics["predictive_parity_diff"]
    contract["eeoc_threshold_breach"] = validated_metrics["disparate_impact_ratio"] < 0.8

    return True


def _resolve_dataset_key(dataset_name: str) -> str:
    key = (dataset_name or "").strip().lower()
    if key in DATASETS:
        return key

    for known_key, filename in DATASETS.items():
        candidates = {
            known_key,
            filename.lower(),
            Path(filename).stem.lower(),
        }
        if key in candidates:
            return known_key

    return key


def load_cached_audit(dataset_name: str) -> dict | None:
    key = _resolve_dataset_key(dataset_name)
    if not key:
        return None

    cache_path = Path(DATA_DIR) / f"{CACHED_PREFIX}{key}.json"
    if not cache_path.exists():
        return None

    try:
        with cache_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None

    contract = _base_contract(dataset_name=key)
    _validate_audit_result(payload, contract)
    contract["component_status"]["cache"] = "hit"
    contract["component_status"]["audit"] = "ok"
    contract["status"] = "ok"
    return contract


def build_failure_contract(message: str, detail: str = "", dataset_name: str = "uploaded_file", cached: bool = False, fast: bool = False) -> dict:
    contract = _base_contract(dataset_name=dataset_name)
    warning = f"{message}: {detail}" if detail else message
    contract["warnings"].append(warning)
    contract["plain_english_summary"] = message
    contract["mode"]["cached"] = cached
    contract["mode"]["fast"] = fast
    contract["component_status"]["cache"] = "hit" if cached else "miss"
    contract["status"] = "failed"
    return contract


def run_full_audit(df: pd.DataFrame, dataset_name: str = "uploaded_file", fast_mode: bool = False, cached_mode: bool = False) -> dict:
    contract = _base_contract(dataset_name=dataset_name)
    contract["mode"]["cached"] = cached_mode
    contract["mode"]["fast"] = fast_mode

    try:
        audit_result = audit(df)
        is_valid = _validate_audit_result(audit_result, contract)
        contract["component_status"]["audit"] = "ok" if is_valid else "fallback"
    except Exception as exc:
        contract["warnings"].append(f"audit failed: {exc}")
        contract["component_status"]["audit"] = "failed"
        contract["plain_english_summary"] = "Audit failed; fallback defaults used."

    if fast_mode:
        contract["component_status"]["shap"] = "skipped"
        contract["component_status"]["counterfactual"] = "skipped"
        contract["component_status"]["regulatory"] = "skipped"
        contract["warnings"].append("fast mode enabled: optional ML components skipped")
    else:
        try:
            shap_result = explain(df)
            if isinstance(shap_result, dict):
                top_features = shap_result.get("top_features", [])
                contract["top_shap_features"] = top_features if isinstance(top_features, list) else []
                contract["group_difference_summary"] = str(shap_result.get("group_difference_summary", ""))
                contract["component_status"]["shap"] = "ok"
            else:
                contract["warnings"].append("shap output invalid; defaults used")
                contract["component_status"]["shap"] = "failed"
        except Exception as exc:
            contract["warnings"].append(f"shap failed: {exc}")
            contract["component_status"]["shap"] = "failed"

        try:
            counterfactual_result = get_counterfactual(df)
            if isinstance(counterfactual_result, dict):
                contract["counterfactual"] = counterfactual_result
                contract["component_status"]["counterfactual"] = "ok"
            else:
                contract["warnings"].append("counterfactual output invalid; default {} used")
                contract["component_status"]["counterfactual"] = "failed"
        except Exception as exc:
            contract["warnings"].append(f"counterfactual failed: {exc}")
            contract["component_status"]["counterfactual"] = "failed"

        try:
            violations_result = get_violations(contract["metrics"])
            if isinstance(violations_result, dict):
                violations = violations_result.get("violations", [])
                contract["regulatory_violations"] = violations if isinstance(violations, list) else []
                contract["component_status"]["regulatory"] = "ok"
            else:
                contract["warnings"].append("regulatory output invalid; default [] used")
                contract["component_status"]["regulatory"] = "failed"
        except Exception as exc:
            contract["warnings"].append(f"regulatory failed: {exc}")
            contract["component_status"]["regulatory"] = "failed"

    if contract["component_status"]["audit"] == "failed":
        contract["status"] = "failed"
    elif any(status == "failed" for status in contract["component_status"].values() if status in {"ok", "failed", "fallback"}):
        contract["status"] = "partial"
    elif contract["warnings"]:
        contract["status"] = "partial"
    else:
        contract["status"] = "ok"

    return contract
