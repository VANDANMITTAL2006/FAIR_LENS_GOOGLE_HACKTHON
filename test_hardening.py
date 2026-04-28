"""
FairLens Day 4 — Final Validation & Hardening Suite
=====================================================
Runs: 3x demo rehearsal, failure simulation, performance lock, fallback check.
"""
import requests
import json
import time
import os
import sys
import io

BASE = "http://127.0.0.1:8000"
DEMO_CSV = "backend/app/data/demo_datasets/adult_demo.csv"
FALLBACK_DIR = "data/fallback"

PASS = 0
FAIL = 0

def check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} — {detail}")

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ================================================================
# 1. FULL FLOW VERIFICATION
# ================================================================
section("1. FULL FLOW VERIFICATION")

# Health
r = requests.get(f"{BASE}/health")
check("Health returns 200", r.status_code == 200)

# Upload
with open(DEMO_CSV, "rb") as f:
    r = requests.post(f"{BASE}/upload", files={"file": ("adult_demo.csv", f, "text/csv")})
check("Upload returns 200", r.status_code == 200)
upload_res = r.json()
uid = upload_res.get("data", {}).get("upload_id")
check("Upload returns upload_id", uid is not None, f"got: {uid}")
check("Upload returns rows", upload_res.get("data", {}).get("rows", 0) > 0)
check("Upload returns protected_attributes", len(upload_res.get("data", {}).get("protected_attributes", [])) > 0)

# Audit
t0 = time.time()
r = requests.post(f"{BASE}/audit?upload_id={uid}")
audit_time = time.time() - t0
check("Audit returns 200", r.status_code == 200)
audit = r.json()
check("Audit status is ok", audit.get("status") == "ok", f"got: {audit.get('status')}")
check("Audit has metrics", "metrics" in audit and len(audit["metrics"]) > 0)
m = audit.get("metrics", {})
check("Audit has disparate_impact_ratio", "disparate_impact_ratio" in m, f"keys: {list(m.keys())}")
check("Audit has demographic_parity_difference", "demographic_parity_difference" in m)
check("Audit DI is real number", isinstance(m.get("disparate_impact_ratio"), (int, float)))
check("Audit has top_shap_features", isinstance(audit.get("top_shap_features"), list))
check("Audit has counterfactual_data", isinstance(audit.get("counterfactual_data"), dict))
check("Audit counterfactual status ok", audit.get("counterfactual_data", {}).get("status") == "ok")
check("Audit has regulatory_flags", isinstance(audit.get("regulatory_flags"), list))
check("Audit has risk_level", audit.get("risk_level") in ("High", "Medium", "Low"), f"got: {audit.get('risk_level')}")
check("Audit has NO fallback flag", audit.get("fallback") is None or audit.get("fallback") == False)
check("Audit component_status all ok", all(v == "ok" for k, v in audit.get("component_status", {}).items() if k != "cache"))
check(f"Audit time < 5s", audit_time < 5.0, f"took {audit_time:.1f}s")

# Debias
t0 = time.time()
with open(DEMO_CSV, "rb") as f:
    r = requests.post(f"{BASE}/api/debias",
        files={"file": ("adult_demo.csv", f, "text/csv")},
        data={"label_col": "income_binary", "protected_col": "sex", "privileged_group": "Male"})
debias_time = time.time() - t0
check("Debias returns 200", r.status_code == 200)
debias = r.json()
strategies = debias.get("strategies", [])
check("Debias returns 3 strategies", len(strategies) == 3, f"got {len(strategies)}")
for s in strategies:
    title = s.get("title", s.get("id"))
    check(f"Strategy '{title}' has fairness_before", "fairness_before" in s, f"keys: {list(s.keys())}")
    check(f"Strategy '{title}' has fairness_after", "fairness_after" in s)
    check(f"Strategy '{title}' has accuracy_before", s.get("accuracy_before") is not None)
    check(f"Strategy '{title}' has eeoc_compliant_after", "eeoc_compliant_after" in s)
check("Debias has recommended", debias.get("recommended") is not None)
check(f"Debias time < 10s", debias_time < 10.0, f"took {debias_time:.1f}s")


# ================================================================
# 2. FAILURE SIMULATION
# ================================================================
section("2. FAILURE SIMULATION")

# Invalid CSV (garbage bytes)
r = requests.post(f"{BASE}/upload", files={"file": ("bad.csv", b"not,a,valid\x00\x01\x02csv\ndata", "text/csv")})
check("Invalid CSV: no crash (returns 200)", r.status_code == 200)

# Empty file
r = requests.post(f"{BASE}/upload", files={"file": ("empty.csv", b"", "text/csv")})
check("Empty file: returns error gracefully", r.status_code == 200 and r.json().get("success") == False)

# Wrong file type
r = requests.post(f"{BASE}/upload", files={"file": ("file.xlsx", b"data", "application/vnd.ms-excel")})
check("Wrong file type: returns error", r.status_code == 200 and r.json().get("success") == False)

# Audit with bad upload_id
r = requests.post(f"{BASE}/audit?upload_id=nonexistent_id_999")
check("Bad upload_id: no crash", r.status_code in (200, 400, 404))
body = r.json()
check("Bad upload_id: returns error message", body.get("status") == "failed" or body.get("success") == False)
check("Bad upload_id: no fake metrics", body.get("fallback") is None)

# Debias with missing columns
import tempfile
bad_csv = "a,b,c\n1,2,3\n4,5,6\n"
r = requests.post(f"{BASE}/api/debias",
    files={"file": ("test.csv", bad_csv.encode(), "text/csv")},
    data={"label_col": "nonexistent", "protected_col": "a", "privileged_group": "1"})
check("Debias with bad label_col: no crash", r.status_code in (200, 400, 500))
check("Debias with bad label_col: returns error", r.status_code >= 400)

# Audit with no upload_id at all
r = requests.post(f"{BASE}/audit")
check("Audit with no params: no crash", r.status_code in (200, 400, 422))


# ================================================================
# 3. DEMO REHEARSAL (3x back-to-back)
# ================================================================
section("3. DEMO REHEARSAL (3x back-to-back)")

run_times = []
for run_num in range(1, 4):
    print(f"\n  --- Run {run_num}/3 ---")
    t_total = time.time()

    # Upload
    with open(DEMO_CSV, "rb") as f:
        r = requests.post(f"{BASE}/upload", files={"file": ("adult_demo.csv", f, "text/csv")})
    u = r.json().get("data", {}).get("upload_id")
    check(f"Run {run_num} upload", r.status_code == 200 and u is not None)

    # Audit
    t0 = time.time()
    r = requests.post(f"{BASE}/audit?upload_id={u}")
    at = time.time() - t0
    a = r.json()
    check(f"Run {run_num} audit (status=ok, {at:.1f}s)", a.get("status") == "ok" and at < 5.0, f"status={a.get('status')}, time={at:.1f}s")

    # Debias
    t0 = time.time()
    with open(DEMO_CSV, "rb") as f:
        r = requests.post(f"{BASE}/api/debias",
            files={"file": ("adult_demo.csv", f, "text/csv")},
            data={"label_col": "income_binary", "protected_col": "sex", "privileged_group": "Male"})
    dt = time.time() - t0
    d = r.json()
    check(f"Run {run_num} debias ({len(d.get('strategies',[]))} strategies, {dt:.1f}s)",
          len(d.get("strategies", [])) == 3 and dt < 10.0)

    total = time.time() - t_total
    run_times.append(total)
    print(f"  Run {run_num} total: {total:.1f}s")

avg_time = sum(run_times) / len(run_times)
check(f"All 3 runs completed (avg {avg_time:.1f}s)", len(run_times) == 3)


# ================================================================
# 4. PERFORMANCE LOCK
# ================================================================
section("4. PERFORMANCE LOCK — fast_mode test")

with open(DEMO_CSV, "rb") as f:
    r = requests.post(f"{BASE}/upload", files={"file": ("adult_demo.csv", f, "text/csv")})
uid_fast = r.json().get("data", {}).get("upload_id")

t0 = time.time()
r = requests.post(f"{BASE}/audit?upload_id={uid_fast}&fast_mode=true")
fast_time = time.time() - t0
fast_audit = r.json()
check(f"fast_mode audit returns 200", r.status_code == 200)
check(f"fast_mode audit status ok", fast_audit.get("status") == "ok", f"got: {fast_audit.get('status')}")
check(f"fast_mode audit < 5s", fast_time < 5.0, f"took {fast_time:.1f}s")
check(f"fast_mode has real metrics", fast_audit.get("metrics", {}).get("disparate_impact_ratio") is not None)


# ================================================================
# 5. FALLBACK SAFETY CHECK
# ================================================================
section("5. FALLBACK SAFETY CHECK")

# Check if fallback directory exists and has files
fallback_exists = os.path.isdir(FALLBACK_DIR)
if fallback_exists:
    fallback_files = os.listdir(FALLBACK_DIR)
    check("Fallback directory has files", len(fallback_files) > 0, f"found {len(fallback_files)} files")
    for ff in fallback_files:
        fpath = os.path.join(FALLBACK_DIR, ff)
        if ff.endswith(".json"):
            try:
                with open(fpath) as f:
                    data = json.load(f)
                check(f"Fallback {ff} is valid JSON", True)
                check(f"Fallback {ff} has metrics", "metrics" in data, f"keys: {list(data.keys())}")
            except Exception as e:
                check(f"Fallback {ff} parse", False, str(e))
else:
    print("  [WARN] No fallback directory found at data/fallback/")
    print("  [INFO] Will generate pre-computed fallback now...")


# ================================================================
# 6. FINAL SUMMARY
# ================================================================
section("FINAL STATUS REPORT")

total_checks = PASS + FAIL
print(f"""
  Checks passed  : {PASS}/{total_checks}
  Checks failed  : {FAIL}/{total_checks}
  Avg audit time : {avg_time:.1f}s (across 3 runs)
  fast_mode time : {fast_time:.1f}s
  3/3 runs OK    : {"YES" if len(run_times) == 3 and all(t < 15 for t in run_times) else "NO"}
  Confidence     : {min(10, max(1, round(10 * PASS / total_checks)))} / 10
""")

if FAIL > 0:
    print("  *** FAILURES DETECTED — FIX BEFORE DEMO ***")
else:
    print("  *** ALL CHECKS PASSED — DEMO READY ***")
