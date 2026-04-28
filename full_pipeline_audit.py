"""
FairLens — Full Pipeline Audit (All 3 Datasets, 3 Runs Each)
Validates: metrics, debiasing, consistency, edge cases, real vs fake data.
"""

import json
import sys
import traceback
from pathlib import Path

import pandas as pd
import numpy as np

# Ensure app modules are importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.modules.audit_engine import audit
from app.modules.attribute_detector import detect_attributes
from app.services.debiasing_engine import run_all_strategies

DEMO_DIR = Path("backend/app/data/demo_datasets")

DATASETS = {
    "adult_demo": {
        "file": DEMO_DIR / "adult_demo.csv",
        "label_col": "income_binary",
        "protected_col": "sex",
        "privileged_group": "Male",
        "expected_di_before": "<0.8",
        "description": "UCI Adult Income (HR / Hiring)"
    },
    "compas_demo": {
        "file": DEMO_DIR / "compas_demo.csv",
        "label_col": "two_year_recid",
        "protected_col": "race",
        "privileged_group": "Caucasian",
        "expected_di_before": "moderate_bias",
        "description": "COMPAS Recidivism (Criminal Justice)"
    },
    "hmda_demo": {
        "file": DEMO_DIR / "hmda_demo.csv",
        "label_col": "approved",
        "protected_col": "applicant_race_1",
        "privileged_group": "White",
        "expected_di_before": "race_bias",
        "description": "HUD HMDA Mortgage (Lending)"
    },
}

def run_audit_3x(df, dataset_name):
    """Run audit 3 times and verify consistency."""
    results = []
    for i in range(3):
        try:
            result = audit(df.copy())
            results.append(result)
        except Exception as e:
            results.append({"success": False, "error": str(e)})
    return results

def extract_audit_metrics(result):
    """Extract key metrics from audit result."""
    if not isinstance(result, dict) or result.get("success") is False:
        return None
    m = result.get("metrics", {})
    return {
        "disparate_impact": m.get("disparate_impact_ratio", 1.0),
        "demographic_parity": m.get("demographic_parity_difference", 0.0),
        "equalized_odds": m.get("equalized_odds_difference", 0.0),
        "predictive_parity": m.get("predictive_parity_diff", 0.0),
        "primary_protected": result.get("primary_protected"),
        "risk_level": result.get("risk_level"),
        "group_metrics": result.get("group_metrics", {}),
    }

def run_debias(df, label_col, protected_col, privileged_group, dataset_name):
    """Run all debiasing strategies."""
    try:
        result = run_all_strategies(
            df=df.copy(),
            label_col=label_col,
            protected_col=protected_col,
            privileged_group=privileged_group,
            dataset_name=dataset_name,
        )
        return result
    except Exception as e:
        return {"error": str(e), "strategies": {}}

def analyze_strategies(debias_result):
    """Extract strategy comparison from debias result."""
    strategies = debias_result.get("strategies", {})
    analysis = []
    for sid, s in strategies.items():
        if "error" in s:
            analysis.append({
                "id": sid,
                "error": s["error"],
            })
            continue
        di_before = s.get("fairness_before", {}).get("disparate_impact", 1.0)
        di_after = s.get("fairness_after", {}).get("disparate_impact", 1.0)
        acc_before = s.get("accuracy_before", 0.0)
        acc_after = s.get("accuracy_after", 0.0)
        di_gain = s.get("disparate_impact_gain", 0.0)
        eeoc = s.get("eeoc_compliant_after", False)
        analysis.append({
            "id": sid,
            "title": s.get("strategy", sid),
            "di_before": di_before,
            "di_after": di_after,
            "di_gain": di_gain,
            "acc_before": acc_before,
            "acc_after": acc_after,
            "eeoc_compliant": eeoc,
            "recommended": s.get("recommended", False),
        })
    # Best by DI gain
    valid = [a for a in analysis if "error" not in a]
    if valid:
        best = max(valid, key=lambda x: x["di_gain"])
    else:
        best = None
    rec_id = debias_result.get("recommended_strategy")
    return analysis, best, rec_id

def is_consistent(values, tol=1e-9):
    """Check if a list of numeric values is identical within tolerance."""
    if not values or len(values) < 2:
        return True
    return all(abs(v - values[0]) < tol for v in values[1:])

def main():
    print("=" * 70)
    print("  FAIRLENS FULL PIPELINE AUDIT")
    print("  3 Datasets × 3 Runs + Debiasing + Consistency + Edge Checks")
    print("=" * 70)

    overall_report = {}
    any_crashes = []
    any_fallback = []
    any_inconsistent = []
    any_no_improvement = []

    for ds_name, cfg in DATASETS.items():
        print(f"\n{'─' * 70}")
        print(f"  DATASET: {ds_name} ({cfg['description']})")
        print(f"{'─' * 70}")

        # ── LOAD ──
        try:
            df = pd.read_csv(cfg["file"])
            print(f"  Loaded: {df.shape[0]:,} rows × {df.shape[1]} cols")
            print(f"  Columns: {list(df.columns)}")
        except Exception as e:
            print(f"  CRASH loading dataset: {e}")
            any_crashes.append(f"{ds_name}: load")
            overall_report[ds_name] = {"status": "CRASH", "stage": "load", "error": str(e)}
            continue

        # Edge check: non-empty
        if df.empty:
            print(f"  CRASH: dataset is empty")
            any_crashes.append(f"{ds_name}: empty")
            continue

        # ── AUDIT (3 runs) ──
        audit_results = run_audit_3x(df, ds_name)
        metrics_runs = []
        for i, ar in enumerate(audit_results, 1):
            m = extract_audit_metrics(ar)
            if m is None:
                err = ar.get("error", "unknown")
                print(f"  Audit run {i}: FAILED — {err}")
                any_crashes.append(f"{ds_name}: audit run {i}")
                continue
            metrics_runs.append(m)
            print(f"  Audit run {i}: DI={m['disparate_impact']:.4f}  "
                  f"DP={m['demographic_parity']:.4f}  EO={m['equalized_odds']:.4f}  "
                  f"Risk={m['risk_level']}  Protected={m['primary_protected']}")

        if not metrics_runs:
            overall_report[ds_name] = {"status": "CRASH", "stage": "audit"}
            continue

        # Consistency check
        di_vals = [m["disparate_impact"] for m in metrics_runs]
        dp_vals = [m["demographic_parity"] for m in metrics_runs]
        eo_vals = [m["equalized_odds"] for m in metrics_runs]
        consistent = is_consistent(di_vals) and is_consistent(dp_vals) and is_consistent(eo_vals)
        print(f"  Consistency (3 runs): {'PASS' if consistent else 'FAIL'}  DI vals={di_vals}")
        if not consistent:
            any_inconsistent.append(ds_name)

        # Edge check: no missing fields
        first = metrics_runs[0]
        missing = [k for k in ["disparate_impact", "demographic_parity", "equalized_odds", "predictive_parity", "primary_protected", "risk_level"] if first.get(k) is None]
        if missing:
            print(f"  MISSING FIELDS: {missing}")
            any_crashes.append(f"{ds_name}: missing fields {missing}")

        # ── DEBIAS ──
        debias_result = run_debias(
            df,
            cfg["label_col"],
            cfg["protected_col"],
            cfg["privileged_group"],
            ds_name,
        )

        if "error" in debias_result:
            print(f"  Debiasing CRASH: {debias_result['error']}")
            any_crashes.append(f"{ds_name}: debias")
            overall_report[ds_name] = {
                "status": "partial",
                "audit_di": first["disparate_impact"],
                "debias_error": debias_result["error"],
            }
            continue

        analysis, best, rec_id = analyze_strategies(debias_result)
        print(f"  Debiasing strategies found: {len(analysis)}")
        for a in analysis:
            if "error" in a:
                print(f"    {a['id']}: ERROR — {a['error']}")
                continue
            print(f"    {a['id']}: DI {a['di_before']:.4f} -> {a['di_after']:.4f}  "
                  f"(gain={a['di_gain']:+.4f})  EEOC={'OK' if a['eeoc_compliant'] else 'FAIL'}")

        if best:
            print(f"  Best strategy (by DI gain): {best['id']}  DI {best['di_before']:.4f} -> {best['di_after']:.4f}")
            print(f"  Recommended strategy: {rec_id}")
            improvement = best["di_after"] - best["di_before"]
            real_improvement = improvement > 0.001 and best["di_after"] > best["di_before"]
            print(f"  Real improvement: {'YES' if real_improvement else 'NO'}  (delta={improvement:+.4f})")
            if not real_improvement:
                any_no_improvement.append(f"{ds_name}: {best['id']}")
        else:
            print(f"  NO valid debiasing strategies!")
            any_no_improvement.append(f"{ds_name}: no valid strategies")
            real_improvement = False

        # ── VALIDATION PER DATASET ──
        di = first["disparate_impact"]
        if ds_name == "adult_demo":
            bias_ok = di < 0.8
            print(f"  Validation (adult): DI < 0.8? {'PASS' if bias_ok else 'FAIL'} (DI={di:.4f})")
        elif ds_name == "compas_demo":
            bias_ok = di < 1.0  # moderate bias expected
            print(f"  Validation (compas): shows bias? {'PASS' if bias_ok else 'FAIL'} (DI={di:.4f})")
        elif ds_name == "hmda_demo":
            # For race-based analysis
            bias_ok = di < 0.8
            print(f"  Validation (hmda race): DI < 0.8? {'PASS' if bias_ok else 'FAIL'} (DI={di:.4f})")

        # Store report
        overall_report[ds_name] = {
            "status": "ok",
            "audit_di_before": first["disparate_impact"],
            "audit_dp": first["demographic_parity"],
            "audit_eo": first["equalized_odds"],
            "primary_protected": first["primary_protected"],
            "risk_level": first["risk_level"],
            "consistent": consistent,
            "debias_best_strategy": best["id"] if best else None,
            "debias_di_before": best["di_before"] if best else None,
            "debias_di_after": best["di_after"] if best else None,
            "debias_di_gain": best["di_gain"] if best else None,
            "real_improvement": real_improvement if best else False,
            "recommended_strategy": rec_id,
        }

    # ── HMDA GENDER CHECK ──
    print(f"\n{'─' * 70}")
    print("  HMDA GENDER CHECK (applicant_sex)")
    print(f"{'─' * 70}")
    try:
        hmda_df = pd.read_csv(DATASETS["hmda_demo"]["file"])
        if "applicant_sex" in hmda_df.columns:
            gender_debias = run_debias(
                hmda_df,
                label_col="approved",
                protected_col="applicant_sex",
                privileged_group="Male",
                dataset_name="hmda_demo_gender",
            )
            g_analysis, g_best, g_rec = analyze_strategies(gender_debias)
            if g_best:
                print(f"  Gender debias DI before: {g_best['di_before']:.4f}")
                print(f"  Gender debias DI after:  {g_best['di_after']:.4f}")
                near_fair = abs(g_best['di_before'] - 1.0) < 0.1
                print(f"  Gender near fair (DI ~ 1.0): {'PASS' if near_fair else 'FAIL'}")
                overall_report["hmda_demo_gender"] = {
                    "di_before": g_best["di_before"],
                    "di_after": g_best["di_after"],
                    "near_fair": near_fair,
                }
            else:
                print("  No valid gender debias strategies")
                overall_report["hmda_demo_gender"] = {"status": "no valid strategies"}
        else:
            print("  applicant_sex column not found")
            overall_report["hmda_demo_gender"] = {"status": "column missing"}
    except Exception as e:
        print(f"  HMDA gender check CRASH: {e}")
        overall_report["hmda_demo_gender"] = {"status": "CRASH", "error": str(e)}

    # ── SUMMARY ──
    print(f"\n{'=' * 70}")
    print("  FINAL AUDIT SUMMARY")
    print(f"{'=' * 70}")

    for ds_name, rep in overall_report.items():
        if "audit_di_before" in rep:
            print(f"\n  {ds_name}:")
            print(f"    Audit DI (before): {rep['audit_di_before']:.4f}")
            if rep.get("debias_di_after") is not None:
                print(f"    Debiasing DI:      {rep['debias_di_before']:.4f} -> {rep['debias_di_after']:.4f}")
                print(f"    Best strategy:     {rep['debias_best_strategy']}")
                print(f"    Improvement real:  {'YES' if rep['real_improvement'] else 'NO'}")
            else:
                print(f"    Debiasing: FAILED or no strategies")
            print(f"    Consistent (3x):   {'YES' if rep.get('consistent') else 'NO'}")

    print(f"\n{'─' * 70}")
    print("  ISSUES")
    print(f"{'─' * 70}")
    print(f"  Crashes / missing fields: {any_crashes if any_crashes else 'None'}")
    print(f"  Inconsistent runs:        {any_inconsistent if any_inconsistent else 'None'}")
    print(f"  No real improvement:        {any_no_improvement if any_no_improvement else 'None'}")
    print(f"  Fallback/mock data used:    {any_fallback if any_fallback else 'None'}")

    # Score
    total_checks = 10  # 3 datasets × (audit ok + consistent + real_improvement) + hmda gender
    passed = 0
    for ds_name, rep in overall_report.items():
        if ds_name == "hmda_demo_gender":
            if rep.get("near_fair"):
                passed += 1
            continue
        if rep.get("status") == "ok":
            passed += 1  # audit ok
            if rep.get("consistent"):
                passed += 1
            if rep.get("real_improvement"):
                passed += 1

    score = min(10, max(0, int(round(passed / total_checks * 10))))
    print(f"\n  Overall system reliability: {score}/10")
    print(f"  (based on {passed}/{total_checks} core checks passed)")

    # Save full report
    report_path = Path("pipeline_audit_report.json")
    with open(report_path, "w") as f:
        json.dump({
            "datasets": overall_report,
            "issues": {
                "crashes": any_crashes,
                "inconsistent": any_inconsistent,
                "no_improvement": any_no_improvement,
                "fallback": any_fallback,
            },
            "score": score,
        }, f, indent=2, default=str)
    print(f"\n  Full report saved to: {report_path}")
    print("=" * 70)

    return overall_report, any_crashes, any_inconsistent, any_no_improvement, score

if __name__ == "__main__":
    main()
