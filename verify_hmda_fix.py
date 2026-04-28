"""
HMDA Fix Verification + Full Regression Check
===============================================
"""
import requests, json, time, hashlib

BASE = "http://127.0.0.1:8000"
HMDA = "backend/app/data/demo_datasets/hmda_demo.csv"
ADULT = "backend/app/data/demo_datasets/adult_demo.csv"
COMPAS = "backend/app/data/demo_datasets/compas_demo.csv"

def test_dataset(name, path, expect_biased=None):
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")
    
    # Upload
    with open(path, "rb") as f:
        r = requests.post(f"{BASE}/upload", files={"file": (name, f, "text/csv")})
    uid = r.json()["data"]["upload_id"]
    rows = r.json()["data"]["rows"]
    prot = r.json()["data"]["protected_attributes"]
    print(f"  Upload: {rows} rows, protected={prot[:3]}")
    
    # Audit
    t0 = time.time()
    r = requests.post(f"{BASE}/audit?upload_id={uid}")
    t = time.time() - t0
    a = r.json()
    
    di = a["metrics"]["disparate_impact_ratio"]
    dpd = a["metrics"]["demographic_parity_difference"]
    eod = a["metrics"]["equalized_odds_difference"]
    ppd = a["metrics"]["predictive_parity_diff"]
    risk = a["risk_level"]
    status = a["status"]
    primary = a.get("primary_protected", "?")
    
    print(f"  Audit ({t:.1f}s): status={status}")
    print(f"  Primary protected: {primary}")
    print(f"  DI  = {di:.4f}  {'< 0.8 BIASED' if di < 0.8 else '>= 0.8 OK'}")
    print(f"  DPD = {dpd:.4f}")
    print(f"  EOD = {eod:.4f}")
    print(f"  PPD = {ppd:.4f}")
    print(f"  Risk: {risk}")
    
    # Group metrics
    gm = a.get("group_metrics", {})
    if gm:
        print(f"  Group selection rates:")
        for g, v in gm.items():
            print(f"    {g}: rate={v['selection_rate']:.4f} n={v['sample_size']}")
    
    # Counterfactual
    cf = a.get("counterfactual_data", {})
    if cf.get("status") == "ok":
        print(f"  Counterfactual: {cf.get('original_group')} -> {cf.get('counterfactual_group')} (delta={cf.get('delta')})")
    
    # Validate expectations
    if expect_biased is True:
        if di >= 0.8:
            print(f"  *** WARNING: Expected bias (DI<0.8) but got DI={di:.4f} ***")
        else:
            print(f"  ✓ Correctly shows bias")
    elif expect_biased is False:
        if di < 0.8:
            print(f"  *** WARNING: Expected fair (DI>=0.8) but got DI={di:.4f} ***")
        else:
            print(f"  ✓ Correctly shows fair")
    
    # Check for DI=1.0 (the bug we're fixing)
    if abs(di - 1.0) < 0.001:
        print(f"  *** ALERT: DI=1.0 detected — check if this is genuine ***")
    
    return {"name": name, "di": di, "dpd": dpd, "eod": eod, "risk": risk, "status": status, "time": t}


# ================================================================
# Test all 3 datasets
# ================================================================
results = []
results.append(test_dataset("adult_demo.csv", ADULT, expect_biased=True))
results.append(test_dataset("compas_demo.csv", COMPAS, expect_biased=None))
results.append(test_dataset("hmda_demo.csv", HMDA, expect_biased=None))

# ================================================================
# Demo flow regression: 3x adult
# ================================================================
print(f"\n{'='*60}")
print(f"  DEMO REGRESSION: 3x adult flow")
print(f"{'='*60}")

for run in range(1, 4):
    with open(ADULT, "rb") as f:
        r = requests.post(f"{BASE}/upload", files={"file": ("adult_demo.csv", f, "text/csv")})
    uid = r.json()["data"]["upload_id"]
    
    r = requests.post(f"{BASE}/audit?upload_id={uid}")
    di = r.json()["metrics"]["disparate_impact_ratio"]
    
    with open(ADULT, "rb") as f:
        r = requests.post(f"{BASE}/api/debias",
            files={"file": ("adult_demo.csv", f, "text/csv")},
            data={"label_col": "income_binary", "protected_col": "sex", "privileged_group": "Male"})
    best = r.json()["strategies"][0]
    di_after = best["fairness_after"]["disparate_impact"]
    
    print(f"  Run {run}: DI={di:.4f} -> {di_after:.4f} ({best['title']}) {'✓' if di_after > di else '✗'}")

# ================================================================
# Summary
# ================================================================
print(f"\n{'='*60}")
print(f"  SUMMARY")
print(f"{'='*60}")
for r in results:
    flag = ""
    if abs(r["di"] - 1.0) < 0.001:
        flag = "  *** STILL DI=1.0 ***"
    elif r["di"] < 0.8:
        flag = "  (biased — good for demo)"
    else:
        flag = "  (fair)"
    print(f"  {r['name']:25s}  DI={r['di']:.4f}  Risk={r['risk']:6s}{flag}")
