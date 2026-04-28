"""End-to-end pipeline test for FairLens backend."""
import requests
import json
import time

BASE = "http://127.0.0.1:8000"
DEMO = "backend/app/data/demo_datasets/adult_demo.csv"

print("=== TEST 1: Health Check ===")
r = requests.get(f"{BASE}/health")
print(f"  Status: {r.status_code}")

print()
print("=== TEST 2: Upload ===")
with open(DEMO, "rb") as f:
    r = requests.post(f"{BASE}/upload", files={"file": ("adult_demo.csv", f, "text/csv")})
print(f"  Status: {r.status_code}")
upload_res = r.json()
data = upload_res.get("data", {})
upload_id = data.get("upload_id")
print(f"  upload_id: {upload_id}")
print(f"  rows: {data.get('rows')}")
print(f"  protected: {data.get('protected_attributes')}")

if not upload_id:
    print("  FATAL: No upload_id returned!")
    exit(1)

print()
print("=== TEST 3: Audit ===")
t0 = time.time()
r = requests.post(f"{BASE}/audit?upload_id={upload_id}")
elapsed = time.time() - t0
print(f"  Status: {r.status_code} ({elapsed:.1f}s)")
audit = r.json()
print(f"  audit status: {audit.get('status')}")
print(f"  risk: {audit.get('risk_level')}")

m = audit.get("metrics", {})
print(f"  disparate_impact: {m.get('disparate_impact_ratio')}")
print(f"  demographic_parity: {m.get('demographic_parity_difference')}")
print(f"  equalized_odds: {m.get('equalized_odds_difference')}")

shap_feats = audit.get("top_shap_features", [])
print(f"  feature_attribution ({len(shap_feats)} features): {[f.get('feature') for f in shap_feats[:3]]}")

cf = audit.get("counterfactual_data", {})
print(f"  counterfactual status: {cf.get('status')}")

reg = audit.get("regulatory_flags", [])
print(f"  regulatory_flags: {len(reg)} flags")

cs = audit.get("component_status", {})
print(f"  component_status: {cs}")

if audit.get("fallback"):
    print("  >>> FAIL: fallback=True means fake data was returned!")
else:
    print("  >>> PASS: No fallback flag (real data)")

print()
print("=== TEST 4: Debias ===")
t0 = time.time()
with open(DEMO, "rb") as f:
    r = requests.post(
        f"{BASE}/api/debias",
        files={"file": ("adult_demo.csv", f, "text/csv")},
        data={
            "label_col": "income_binary",
            "protected_col": "sex",
            "privileged_group": "Male",
        },
    )
elapsed = time.time() - t0
print(f"  Status: {r.status_code} ({elapsed:.1f}s)")
if r.status_code == 200:
    debias = r.json()
    strategies = debias.get("strategies", [])
    print(f"  strategies: {len(strategies)}")
    for s in strategies:
        title = s.get("title", s.get("id", "unknown"))
        di_before = s.get("fairness_before", {}).get("disparate_impact", "?")
        di_after = s.get("fairness_after", {}).get("disparate_impact", "?")
        eeoc = s.get("eeoc_compliant_after", False)
        print(f"    {title}: DI {di_before} -> {di_after} | EEOC: {'OK' if eeoc else 'FAIL'}")
    print(f"  recommended: {debias.get('recommended')}")
else:
    print(f"  ERROR: {r.text[:300]}")

print()
print("=" * 50)
print("ALL TESTS COMPLETE")
print("=" * 50)
