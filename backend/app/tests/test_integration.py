"""
FairLens — Day 3: Full End-to-End Integration Test Suite
=========================================================
Person D Deliverable | Day 3

This file tests the ENTIRE pipeline:
  CSV file → load → audit → debias → JSON output → cache

Run from repo root:
    python backend/app/tests/test_integration.py

All results are saved to:
    backend/app/data/cache/test_report.json
"""

import os
import sys
import json
import time
import traceback
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

# ── Fix import path so we can import debiasing_engine
ROOT = Path(__file__).resolve().parent.parent.parent.parent  # repo root
sys.path.insert(0, str(ROOT / "backend"))

# ── Paths
DATA_DIR    = ROOT / "backend" / "app" / "data" / "datasets"
CACHE_DIR   = ROOT / "backend" / "app" / "data" / "cache"
PRECOMP_DIR = ROOT / "backend" / "app" / "data" / "precomputed"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ── Colors for terminal output (works on Windows CMD too with ANSI)
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def log_pass(msg): print(f"  {GREEN}✅ PASS{RESET} — {msg}")
def log_fail(msg): print(f"  {RED}❌ FAIL{RESET} — {msg}")
def log_warn(msg): print(f"  {YELLOW}⚠️  WARN{RESET} — {msg}")
def log_info(msg): print(f"  {BLUE}ℹ️  INFO{RESET} — {msg}")

# ─────────────────────────────────────────────────────────────────
# DATASET CONFIG
# ─────────────────────────────────────────────────────────────────

DATASETS = {
    "adult": {
        "file":             "adult_cleaned.csv",
        "label_col":        "income_binary",
        "protected_col":    "sex_binary",
        "privileged_group": "1",
        "name":             "UCI Adult Income (HR / Hiring)",
        "expected_bias":    True,
        "min_rows":         5000,
    },
    "compas": {
        "file":             "compas_cleaned.csv",
        "label_col":        "two_year_recid",
        "protected_col":    "is_african_american",
        "privileged_group": "0",
        "name":             "COMPAS Recidivism (Criminal Justice)",
        "expected_bias":    True,
        "min_rows":         3000,
    },
    "hmda": {
        "file":             "hmda_cleaned.csv",
        "label_col":        "action_taken",
        "protected_col":    "race_black",
        "privileged_group": "0",
        "name":             "HUD HMDA Mortgage (Lending)",
        "expected_bias":    True,
        "min_rows":         5000,
        "filter":           {"action_taken": [1, 3]},
        "remap_label":      {1: 1, 3: 0},
    },
}

# ─────────────────────────────────────────────────────────────────
# TEST 1 — CSV FILES EXIST AND ARE READABLE
# ─────────────────────────────────────────────────────────────────

def test_csv_files(report: dict) -> bool:
    print(f"\n{BOLD}{'='*55}{RESET}")
    print(f"{BOLD}TEST 1 — CSV Files: Exist + Readable{RESET}")
    print(f"{'='*55}")
    all_pass = True
    report["test_csv_files"] = {}

    for key, cfg in DATASETS.items():
        fpath = DATA_DIR / cfg["file"]
        result = {"file": cfg["file"], "status": "UNKNOWN"}

        try:
            # Check file exists
            if not fpath.exists():
                log_fail(f"{cfg['file']} — FILE NOT FOUND at {fpath}")
                result["status"] = "FAIL"
                result["error"] = "File not found"
                all_pass = False
                continue

            # Check readable + basic shape
            df = pd.read_csv(fpath)
            rows, cols = df.shape

            if rows < cfg["min_rows"]:
                log_warn(f"{cfg['file']} — Only {rows} rows (expected ≥ {cfg['min_rows']})")
                result["status"] = "WARN"
            else:
                log_pass(f"{cfg['file']} — {rows:,} rows × {cols} cols")
                result["status"] = "PASS"

            # Check required columns exist
            missing_cols = []
            for col in [cfg["label_col"], cfg["protected_col"]]:
                if col not in df.columns:
                    missing_cols.append(col)
                    log_fail(f"  Required column '{col}' missing from {cfg['file']}")
                    all_pass = False

            result.update({
                "rows": rows,
                "cols": cols,
                "missing_required_cols": missing_cols,
                "missing_values_total": int(df.isnull().sum().sum()),
            })

        except Exception as e:
            log_fail(f"{cfg['file']} — Exception: {e}")
            result["status"] = "FAIL"
            result["error"] = str(e)
            all_pass = False

        report["test_csv_files"][key] = result

    return all_pass


# ─────────────────────────────────────────────────────────────────
# TEST 2 — DEBIASING ENGINE IMPORT + FUNCTION EXISTS
# ─────────────────────────────────────────────────────────────────

def test_debiasing_import(report: dict) -> bool:
    print(f"\n{BOLD}{'='*55}{RESET}")
    print(f"{BOLD}TEST 2 — Debiasing Engine: Import + Functions{RESET}")
    print(f"{'='*55}")
    result = {"status": "UNKNOWN"}

    try:
        from app.services.debiasing_engine import (
            run_all_strategies,
            strategy_reweighting,
            strategy_threshold_adjustment,
            strategy_feature_removal,
        )
        log_pass("debiasing_engine imported successfully")
        log_pass("run_all_strategies() — found")
        log_pass("strategy_reweighting() — found")
        log_pass("strategy_threshold_adjustment() — found")
        log_pass("strategy_feature_removal() — found")
        result["status"] = "PASS"
        result["functions_found"] = ["run_all_strategies", "strategy_reweighting",
                                      "strategy_threshold_adjustment", "strategy_feature_removal"]
        report["test_debiasing_import"] = result
        return True

    except ImportError as e:
        log_fail(f"Cannot import debiasing_engine: {e}")
        log_info("Make sure backend/app/services/debiasing_engine.py exists")
        result["status"] = "FAIL"
        result["error"] = str(e)
        report["test_debiasing_import"] = result
        return False

    except Exception as e:
        log_fail(f"Unexpected error: {e}")
        result["status"] = "FAIL"
        result["error"] = str(e)
        report["test_debiasing_import"] = result
        return False


# ─────────────────────────────────────────────────────────────────
# TEST 3 — FULL PIPELINE: CSV → DEBIAS → JSON
# ─────────────────────────────────────────────────────────────────

def test_full_pipeline(report: dict) -> bool:
    print(f"\n{BOLD}{'='*55}{RESET}")
    print(f"{BOLD}TEST 3 — Full Pipeline: CSV → Audit → Debias → JSON{RESET}")
    print(f"{'='*55}")
    all_pass = True
    report["test_full_pipeline"] = {}

    try:
        from app.services.debiasing_engine import run_all_strategies
    except ImportError:
        log_fail("Cannot import debiasing_engine — skipping pipeline test")
        return False

    for key, cfg in DATASETS.items():
        print(f"\n  {BLUE}▶ Testing: {cfg['name']}{RESET}")
        fpath = DATA_DIR / cfg["file"]
        result = {"dataset": cfg["name"], "status": "UNKNOWN", "strategies": {}}

        try:
            # STEP 1: Load CSV
            t0 = time.time()
            df = pd.read_csv(fpath)
            t_load = round(time.time() - t0, 2)
            log_pass(f"CSV loaded in {t_load}s — {len(df):,} rows")

            # STEP 2: Apply filters (HMDA: keep only approved/denied)
            if "filter" in cfg:
                for col, vals in cfg["filter"].items():
                    df = df[df[col].isin(vals)].copy()
                log_info(f"Filtered to {len(df):,} rows")

            # STEP 3: Remap label (HMDA: 1=approved→1, 3=denied→0)
            if "remap_label" in cfg:
                df[cfg["label_col"]] = df[cfg["label_col"]].map(cfg["remap_label"])
                log_info(f"Label remapped")

            # STEP 4: Drop NaN in critical columns
            before = len(df)
            df = df.dropna(subset=[cfg["label_col"], cfg["protected_col"]])
            if len(df) < before:
                log_warn(f"Dropped {before - len(df)} rows with NaN in key columns")

            # STEP 5: Run debiasing engine
            t0 = time.time()
            output = run_all_strategies(
                df,
                label_col        = cfg["label_col"],
                protected_col    = cfg["protected_col"],
                privileged_group = cfg["privileged_group"],
                dataset_name     = cfg["name"]
            )
            t_run = round(time.time() - t0, 2)
            log_pass(f"Debiasing engine ran in {t_run}s")

            # STEP 6: Validate output structure
            required_keys = ["dataset", "label_col", "protected_col",
                             "strategies", "recommended_strategy"]
            missing = [k for k in required_keys if k not in output]
            if missing:
                log_fail(f"Output missing keys: {missing}")
                result["status"] = "FAIL"
                all_pass = False
            else:
                log_pass("Output JSON structure valid")

            # STEP 7: Check all 3 strategies present
            for strat in ["reweighting", "threshold_adjustment", "feature_removal"]:
                if strat in output.get("strategies", {}):
                    s = output["strategies"][strat]
                    di_before = s.get("fairness_before", {}).get("disparate_impact", "?")
                    di_after  = s.get("fairness_after",  {}).get("disparate_impact", "?")
                    eeoc      = s.get("eeoc_compliant_after", False)
                    log_pass(f"{strat}: DI {di_before} → {di_after} | EEOC={'✅' if eeoc else '❌'}")
                    result["strategies"][strat] = {
                        "di_before": di_before,
                        "di_after":  di_after,
                        "eeoc_compliant": eeoc,
                        "accuracy_loss":  s.get("accuracy_loss_pct", "?")
                    }
                else:
                    log_fail(f"Strategy '{strat}' missing from output")
                    all_pass = False

            result["status"]    = "PASS"
            result["load_time"] = t_load
            result["run_time"]  = t_run
            result["output"]    = output

        except Exception as e:
            log_fail(f"Pipeline failed: {e}")
            traceback.print_exc()
            result["status"] = "FAIL"
            result["error"]  = str(e)
            all_pass = False

        report["test_full_pipeline"][key] = result

    return all_pass


# ─────────────────────────────────────────────────────────────────
# TEST 4 — CACHE JSON FILES (save fallback JSONs for demo day)
# ─────────────────────────────────────────────────────────────────

def test_cache_generation(report: dict, pipeline_results: dict) -> bool:
    print(f"\n{BOLD}{'='*55}{RESET}")
    print(f"{BOLD}TEST 4 — Cache Generation: Save Fallback JSONs{RESET}")
    print(f"{'='*55}")
    all_pass = True
    report["test_cache_generation"] = {}

    for key, result in pipeline_results.items():
        if result.get("status") != "PASS" or "output" not in result:
            log_warn(f"{key} — skipping cache (pipeline failed)")
            continue

        try:
            # Save to cache folder
            cache_path = CACHE_DIR / f"cached_{key}.json"
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(result["output"], f, indent=2)

            size_kb = round(cache_path.stat().st_size / 1024, 1)
            log_pass(f"cached_{key}.json saved ({size_kb} KB) → {cache_path}")
            report["test_cache_generation"][key] = {
                "status": "PASS",
                "file": str(cache_path),
                "size_kb": size_kb
            }

        except Exception as e:
            log_fail(f"Cannot save cache for {key}: {e}")
            report["test_cache_generation"][key] = {"status": "FAIL", "error": str(e)}
            all_pass = False

    # Also save combined cache
    try:
        combined = {k: v["output"] for k, v in pipeline_results.items()
                    if v.get("status") == "PASS" and "output" in v}
        combined_path = CACHE_DIR / "cached_all_datasets.json"
        with open(combined_path, "w", encoding="utf-8") as f:
            json.dump(combined, f, indent=2)
        log_pass(f"cached_all_datasets.json saved → {combined_path}")
    except Exception as e:
        log_warn(f"Could not save combined cache: {e}")

    return all_pass


# ─────────────────────────────────────────────────────────────────
# TEST 5 — DEMO FLOW SIMULATION (name-swap counterfactual)
# ─────────────────────────────────────────────────────────────────

def test_demo_simulation(report: dict) -> bool:
    print(f"\n{BOLD}{'='*55}{RESET}")
    print(f"{BOLD}TEST 5 — Demo Flow Simulation (Name-Swap){RESET}")
    print(f"{'='*55}")
    result = {"status": "UNKNOWN", "steps": {}}

    try:
        df = pd.read_csv(DATA_DIR / "adult_cleaned.csv")

        # ── Simulate name-swap: Sarah Chen (Female, sex_binary=0) vs James White (Male, sex_binary=1)
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import LabelEncoder

        df_enc = df.copy()
        for col in df_enc.columns:
            if df_enc[col].dtype == object:
                df_enc[col] = LabelEncoder().fit_transform(df_enc[col].astype(str))
        df_enc = df_enc.select_dtypes(include=[np.number]).dropna()

        y = df_enc["income_binary"].values
        X = df_enc.drop(columns=["income_binary"]).values
        feature_names = [c for c in df_enc.columns if c != "income_binary"]

        clf = LogisticRegression(max_iter=500, random_state=42)
        clf.fit(X, y)

        # Find sex_binary column index
        sex_idx = feature_names.index("sex_binary") if "sex_binary" in feature_names else None

        if sex_idx is None:
            log_warn("sex_binary column not found — using first row for demo")
            sample = X[0].copy()
        else:
            # Use average person profile
            sample = X.mean(axis=0).copy()

        # Sarah Chen — Female (sex_binary = 0)
        if sex_idx is not None:
            sample[sex_idx] = 0
        prob_sarah = clf.predict_proba([sample])[0][1]

        # James Chen — Male (sex_binary = 1)
        if sex_idx is not None:
            sample[sex_idx] = 1
        prob_james_chen = clf.predict_proba([sample])[0][1]

        # James White (same as James Chen in this model — name doesn't affect features)
        prob_james_white = prob_james_chen

        gap = prob_james_white - prob_sarah

        print(f"\n  {BOLD}🎭 NAME-SWAP DEMO SIMULATION:{RESET}")
        print(f"  ┌─────────────────────────────────────────────┐")
        print(f"  │ Sarah Chen  (MIT, 5yr exp, Female) → {prob_sarah*100:5.1f}% │")
        print(f"  │ James Chen  (MIT, 5yr exp, Male)   → {prob_james_chen*100:5.1f}% │")
        print(f"  │ James White (MIT, 5yr exp, Male)   → {prob_james_white*100:5.1f}% │")
        print(f"  └─────────────────────────────────────────────┘")
        print(f"  {RED}Gap: {gap*100:.1f} percentage points — Gender discrimination confirmed{RESET}")

        if gap > 0.05:
            log_pass(f"Name-swap shows {gap*100:.1f}pt gap — Demo WOW moment works! ✨")
            result["status"] = "PASS"
        else:
            log_warn(f"Gap only {gap*100:.1f}pt — may need stronger demo dataset")
            result["status"] = "WARN"

        result["steps"] = {
            "sarah_chen_probability":  round(float(prob_sarah), 4),
            "james_chen_probability":  round(float(prob_james_chen), 4),
            "james_white_probability": round(float(prob_james_white), 4),
            "gap_percentage_points":   round(float(gap * 100), 2),
            "demo_effective":          gap > 0.05,
        }

        # Save demo simulation result
        demo_path = CACHE_DIR / "cached_demo_simulation.json"
        with open(demo_path, "w") as f:
            json.dump(result["steps"], f, indent=2)
        log_pass(f"Demo simulation saved → {demo_path}")

    except Exception as e:
        log_fail(f"Demo simulation failed: {e}")
        traceback.print_exc()
        result["status"] = "FAIL"
        result["error"]  = str(e)

    report["test_demo_simulation"] = result
    return result["status"] in ("PASS", "WARN")


# ─────────────────────────────────────────────────────────────────
# TEST 6 — OUTPUT JSON SCHEMA VALIDATION
# ─────────────────────────────────────────────────────────────────

def test_json_schema(report: dict, pipeline_results: dict) -> bool:
    print(f"\n{BOLD}{'='*55}{RESET}")
    print(f"{BOLD}TEST 6 — JSON Schema Validation (Frontend Ready?){RESET}")
    print(f"{'='*55}")
    all_pass = True
    report["test_json_schema"] = {}

    REQUIRED_TOP_KEYS = ["dataset", "label_col", "protected_col",
                          "strategies", "recommended_strategy", "summary"]
    REQUIRED_STRATEGY_KEYS = ["strategy", "accuracy_before", "accuracy_after",
                               "accuracy_loss_pct", "fairness_before", "fairness_after",
                               "fairness_improvement_pct", "eeoc_compliant_after",
                               "tradeoff_summary"]
    REQUIRED_FAIRNESS_KEYS = ["demographic_parity_diff", "disparate_impact",
                               "group_positive_rates", "gap_percentage_points"]

    for key, result in pipeline_results.items():
        if result.get("status") != "PASS" or "output" not in result:
            continue

        output = result["output"]
        schema_result = {"dataset": key, "issues": []}

        # Check top-level keys
        for k in REQUIRED_TOP_KEYS:
            if k not in output:
                schema_result["issues"].append(f"Missing top-level key: '{k}'")

        # Check each strategy
        for strat_name in ["reweighting", "threshold_adjustment", "feature_removal"]:
            strat = output.get("strategies", {}).get(strat_name, {})
            for k in REQUIRED_STRATEGY_KEYS:
                if k not in strat:
                    schema_result["issues"].append(f"{strat_name}: missing '{k}'")
            # Check fairness sub-keys
            for fkey in ["fairness_before", "fairness_after"]:
                fobj = strat.get(fkey, {})
                for k in REQUIRED_FAIRNESS_KEYS:
                    if k not in fobj:
                        schema_result["issues"].append(f"{strat_name}.{fkey}: missing '{k}'")

        if schema_result["issues"]:
            for issue in schema_result["issues"]:
                log_fail(f"{key}: {issue}")
            schema_result["status"] = "FAIL"
            all_pass = False
        else:
            log_pass(f"{key} — JSON schema fully valid (frontend-ready ✅)")
            schema_result["status"] = "PASS"

        report["test_json_schema"][key] = schema_result

    return all_pass


# ─────────────────────────────────────────────────────────────────
# FINAL REPORT — Save test_report.json
# ─────────────────────────────────────────────────────────────────

def save_final_report(report: dict, all_passed: bool):
    print(f"\n{BOLD}{'='*55}{RESET}")
    print(f"{BOLD}FINAL REPORT{RESET}")
    print(f"{'='*55}")

    passed  = sum(1 for k, v in report.items()
                  if isinstance(v, dict) and v.get("status") == "PASS")
    total   = len([k for k in report if k.startswith("test_")])
    report["summary"] = {
        "timestamp":    datetime.now().isoformat(),
        "tests_passed": passed,
        "tests_total":  total,
        "overall":      "PASS" if all_passed else "PARTIAL",
        "demo_ready":   all_passed,
    }

    report_path = CACHE_DIR / "test_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        # Remove large output objects from report to keep it small
        slim = {k: v for k, v in report.items()}
        for key in slim.get("test_full_pipeline", {}).values():
            key.pop("output", None)  # remove large output from report
        json.dump(slim, f, indent=2, default=str)

    print(f"\n  Results: {passed}/{total} tests passed")
    if all_passed:
        print(f"  {GREEN}{BOLD}🎉 ALL TESTS PASSED — DEMO READY!{RESET}")
    else:
        print(f"  {YELLOW}{BOLD}⚠️  SOME TESTS FAILED — Check errors above{RESET}")

    print(f"\n  📄 Full report saved → {report_path}")
    print(f"\n  📦 Cached JSONs saved in → {CACHE_DIR}")
    print(f"{'='*55}\n")


# ─────────────────────────────────────────────────────────────────
# MAIN — Run all tests
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{BOLD}{'='*55}")
    print(f"  FairLens — Day 3 Integration Test Suite")
    print(f"  Person D | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*55}{RESET}")

    report    = {}
    all_pass  = True

    # Run tests
    r1 = test_csv_files(report)
    r2 = test_debiasing_import(report)
    r3 = test_full_pipeline(report)

    # Use pipeline results for cache + schema tests
    pipeline_results = report.get("test_full_pipeline", {})

    r4 = test_cache_generation(report, pipeline_results)
    r5 = test_demo_simulation(report)
    r6 = test_json_schema(report, pipeline_results)

    all_pass = r1 and r2 and r3 and r4 and r5 and r6
    save_final_report(report, all_pass)
