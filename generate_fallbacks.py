"""Generate pre-computed fallback JSON for demo datasets."""
import requests
import json
import os

BASE = "http://127.0.0.1:8000"
DEMO_DIR = "backend/app/data/demo_datasets"
FALLBACK_DIR = "data/fallback"
os.makedirs(FALLBACK_DIR, exist_ok=True)

datasets = [
    {"file": "adult_demo.csv", "key": "adult_demo"},
    {"file": "compas_demo.csv", "key": "compas_demo"},
    {"file": "hmda_demo.csv", "key": "hmda_demo"},
]

for ds in datasets:
    fpath = os.path.join(DEMO_DIR, ds["file"])
    if not os.path.exists(fpath):
        print(f"  SKIP: {fpath} not found")
        continue

    # Upload
    with open(fpath, "rb") as f:
        r = requests.post(f"{BASE}/upload", files={"file": (ds["file"], f, "text/csv")})
    uid = r.json().get("data", {}).get("upload_id")
    if not uid:
        print(f"  FAIL: Upload failed for {ds['file']}")
        continue

    # Audit
    r = requests.post(f"{BASE}/audit?upload_id={uid}")
    if r.status_code != 200:
        print(f"  FAIL: Audit failed for {ds['file']}")
        continue

    audit_data = r.json()
    if audit_data.get("status") not in ("ok", "partial"):
        print(f"  FAIL: Audit status={audit_data.get('status')} for {ds['file']}")
        continue

    # Save fallback
    out_path = os.path.join(FALLBACK_DIR, f"{ds['key']}_audit.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(audit_data, f, indent=2)

    di = audit_data.get("metrics", {}).get("disparate_impact_ratio", "?")
    print(f"  OK: {ds['key']}_audit.json (DI={di})")

print(f"\nFallback files saved to {FALLBACK_DIR}/")
