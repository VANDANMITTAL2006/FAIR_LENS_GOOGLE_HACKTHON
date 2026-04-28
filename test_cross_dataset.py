"""
FairLens — Cross-Dataset ML Pipeline Audit
============================================
Full pipeline: Upload → Audit → Debias for all 3 datasets × 3 runs each
"""
import requests, json, time, hashlib

BASE = "http://127.0.0.1:8000"
DATASETS = [
    {"name": "adult_demo.csv",  "path": "backend/app/data/demo_datasets/adult_demo.csv",
     "debias": {"label_col": "income_binary", "protected_col": "sex", "privileged_group": "Male"}},
    {"name": "compas_demo.csv", "path": "backend/app/data/demo_datasets/compas_demo.csv",
     "debias": {"label_col": "two_year_recid", "protected_col": "sex", "privileged_group": "1"}},
    {"name": "hmda_demo.csv",   "path": "backend/app/data/demo_datasets/hmda_demo.csv",
     "debias": {"label_col": "action_taken", "protected_col": "applicant_sex", "privileged_group": "Male"}},
]

all_results = {}

# ================================================================
# SECTIONS 1-4: Full pipeline per dataset
# ================================================================
for ds in DATASETS:
    name = ds["name"]
    print(f"\n{'='*70}")
    print(f"  DATASET: {name}")
    print(f"{'='*70}")

    # Upload
    with open(ds["path"], "rb") as f:
        r = requests.post(f"{BASE}/upload", files={"file": (name, f, "text/csv")})
    u = r.json()
    uid = u["data"]["upload_id"]
    rows = u["data"]["rows"]
    prot = u["data"]["protected_attributes"]
    print(f"  Upload: {rows} rows | protected: {prot[:4]}")

    # Audit
    t0 = time.time()
    r = requests.post(f"{BASE}/audit?upload_id={uid}")
    audit_time = time.time() - t0
    a = r.json()
    m = a["metrics"]

    print(f"\n  AUDIT ({audit_time:.1f}s):")
    print(f"    status        : {a['status']}")
    print(f"    primary_prot  : {a.get('primary_protected')}")
    print(f"    DI            : {m['disparate_impact_ratio']:.4f}")
    print(f"    DPD           : {m['demographic_parity_difference']:.4f}")
    print(f"    EOD           : {m['equalized_odds_difference']:.4f}")
    print(f"    PPD           : {m['predictive_parity_diff']:.4f}")
    print(f"    risk_level    : {a['risk_level']}")
    print(f"    fallback      : {a.get('fallback', 'NONE')}")

    # Group metrics
    gm = a.get("group_metrics", {})
    print(f"    groups        : {len(gm)}")
    for g, v in gm.items():
        print(f"      {g:30s} rate={v['selection_rate']:.4f} n={v['sample_size']}")

    # Component status
    cs = a.get("component_status", {})
    print(f"    components    : {cs}")

    # Counterfactual
    cf = a.get("counterfactual_data", {})
    print(f"    counterfactual: status={cf.get('status')}")

    # Field completeness check
    required = ["status", "metrics", "risk_level", "protected_attributes", "primary_protected",
                 "top_shap_features", "counterfactual_data", "regulatory_flags", "component_status"]
    missing = [f for f in required if f not in a]
    print(f"    missing fields: {missing if missing else 'NONE'}")

    # Debias
    t0 = time.time()
    with open(ds["path"], "rb") as f:
        r = requests.post(f"{BASE}/api/debias",
            files={"file": (name, f, "text/csv")},
            data=ds["debias"])
    debias_time = time.time() - t0
    d = r.json()
    strategies = d.get("strategies", [])

    print(f"\n  DEBIAS ({debias_time:.1f}s): {len(strategies)} strategies")
    print(f"    recommended   : {d.get('recommended')}")

    best_strat = None
    for s in strategies:
        title = s["title"]
        fb = s["fairness_before"]
        fa = s["fairness_after"]
        di_b = fb["disparate_impact"]
        di_a = fa["disparate_impact"]
        gain = s["disparate_impact_gain"]
        acc_b = s["accuracy_before"]
        acc_a = s["accuracy_after"]
        eeoc = s["eeoc_compliant_after"]
        rec = " [RECOMMENDED]" if s.get("recommended") else ""

        improved = di_a > di_b
        real_gain = abs(gain - (di_a - di_b)) < 0.001

        print(f"\n    {title}{rec}")
        print(f"      DI   : {di_b:.4f} → {di_a:.4f} (gain={gain:.4f}) {'✓ improved' if improved else '✗ no change'}")
        print(f"      Acc  : {acc_b:.4f} → {acc_a:.4f}")
        print(f"      EEOC : {eeoc}")
        print(f"      Math : {'✓ valid' if real_gain else '✗ INVALID'}")

        if s.get("recommended"):
            best_strat = s

    all_results[name] = {
        "di_before": m["disparate_impact_ratio"],
        "dpd": m["demographic_parity_difference"],
        "eod": m["equalized_odds_difference"],
        "risk": a["risk_level"],
        "primary": a.get("primary_protected"),
        "best_strategy": best_strat["title"] if best_strat else "?",
        "di_after": best_strat["fairness_after"]["disparate_impact"] if best_strat else None,
        "di_gain": best_strat["disparate_impact_gain"] if best_strat else 0,
        "eeoc_after": best_strat["eeoc_compliant_after"] if best_strat else False,
        "status": a["status"],
        "missing_fields": missing,
        "strategies_count": len(strategies),
    }


# ================================================================
# SECTION 5: CONSISTENCY — 3 runs each
# ================================================================
print(f"\n{'='*70}")
print(f"  CONSISTENCY CHECK — 3 runs per dataset")
print(f"{'='*70}")

consistency_ok = True
for ds in DATASETS:
    name = ds["name"]
    hashes = []
    for i in range(3):
        with open(ds["path"], "rb") as f:
            r = requests.post(f"{BASE}/upload", files={"file": (name, f, "text/csv")})
        uid = r.json()["data"]["upload_id"]
        r = requests.post(f"{BASE}/audit?upload_id={uid}")
        h = hashlib.md5(json.dumps(r.json()["metrics"], sort_keys=True).encode()).hexdigest()[:12]
        hashes.append(h)
    identical = len(set(hashes)) == 1
    if not identical:
        consistency_ok = False
    print(f"  {name:25s} {hashes} {'✓ identical' if identical else '✗ FLUCTUATING'}")


# ================================================================
# SECTION 2: Cross-dataset uniqueness
# ================================================================
print(f"\n{'='*70}")
print(f"  CROSS-DATASET UNIQUENESS")
print(f"{'='*70}")

dis = [all_results[ds["name"]]["di_before"] for ds in DATASETS]
unique_di = len(set(round(d, 4) for d in dis)) == len(dis)
print(f"  DI values: {[round(d, 4) for d in dis]}")
print(f"  All unique: {'✓ YES' if unique_di else '✗ IDENTICAL (suspicious)'}")


# ================================================================
# FINAL REPORT
# ================================================================
print(f"\n{'='*70}")
print(f"  FINAL CROSS-DATASET AUDIT REPORT")
print(f"{'='*70}")

print(f"\n  {'Dataset':25s} {'Before DI':>10s} {'After DI':>10s} {'Strategy':>25s} {'Real':>6s} {'EEOC':>6s}")
print(f"  {'-'*25} {'-'*10} {'-'*10} {'-'*25} {'-'*6} {'-'*6}")

all_ok = True
for ds in DATASETS:
    name = ds["name"]
    r = all_results[name]
    improved = r["di_after"] and r["di_after"] > r["di_before"]
    print(f"  {name:25s} {r['di_before']:10.4f} {r['di_after']:10.4f} {r['best_strategy']:>25s} {'✓' if improved else '✗':>6s} {'✓' if r['eeoc_after'] else '✗':>6s}")
    if not improved:
        all_ok = False

print(f"\n  Datasets behaving incorrectly : {'NONE' if all_ok else 'SEE ABOVE'}")
print(f"  Strategies not working        : {'NONE' if all_ok else 'CHECK REWEIGHTING'}")
print(f"  Consistency across 3 runs     : {'✓ ALL IDENTICAL' if consistency_ok else '✗ FLUCTUATING'}")
print(f"  Cross-dataset uniqueness      : {'✓ YES' if unique_di else '✗ NO'}")

score = 10
if not all_ok: score -= 2
if not consistency_ok: score -= 2
if not unique_di: score -= 1
if any(r["missing_fields"] for r in all_results.values()): score -= 1

print(f"\n  Overall reliability           : {score}/10")
print(f"{'='*70}")
