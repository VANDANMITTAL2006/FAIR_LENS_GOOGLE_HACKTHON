"""
FairLens — Final Demo Dry Run (3x deterministic)
Simulates EXACT demo: Upload → Audit → Debias → Apply Best → Verify Improvement
"""
import requests
import json
import time

BASE = "http://127.0.0.1:8000"
DEMO = "backend/app/data/demo_datasets/adult_demo.csv"

results = []

for run in range(1, 4):
    print(f"\n{'='*60}")
    print(f"  DEMO DRY RUN {run}/3")
    print(f"{'='*60}")
    t_total = time.time()

    # 1. Upload
    with open(DEMO, "rb") as f:
        r = requests.post(f"{BASE}/upload", files={"file": ("adult_demo.csv", f, "text/csv")})
    uid = r.json()["data"]["upload_id"]
    rows = r.json()["data"]["rows"]
    print(f"  1. Upload: {rows} rows, upload_id={uid[:12]}...")

    # 2. Audit
    t0 = time.time()
    r = requests.post(f"{BASE}/audit?upload_id={uid}")
    audit_time = time.time() - t0
    audit = r.json()
    di_before = audit["metrics"]["disparate_impact_ratio"]
    risk = audit["risk_level"]
    print(f"  2. Audit: DI={di_before:.4f}, risk={risk} ({audit_time:.1f}s)")

    # 3. Debias
    t0 = time.time()
    with open(DEMO, "rb") as f:
        r = requests.post(f"{BASE}/api/debias",
            files={"file": ("adult_demo.csv", f, "text/csv")},
            data={"label_col": "income_binary", "protected_col": "sex", "privileged_group": "Male"})
    debias_time = time.time() - t0
    debias = r.json()
    strategies = debias["strategies"]
    print(f"  3. Debias: {len(strategies)} strategies ({debias_time:.1f}s)")

    # 4. Best strategy (first one — sorted by effectiveness)
    best = strategies[0]
    best_title = best["title"]
    best_recommended = best.get("recommended", False)
    di_after = best["fairness_after"]["disparate_impact"]
    eeoc = best["eeoc_compliant_after"]
    acc_loss = best.get("accuracy_loss_pct", 0)
    print(f"  4. Best: {best_title} (recommended={best_recommended})")
    print(f"     DI: {di_before:.4f} -> {di_after:.4f}")
    print(f"     EEOC compliant: {eeoc}")
    print(f"     Accuracy loss: {abs(acc_loss):.1f}%")

    # 5. Verify improvement
    improvement = di_after - di_before
    clearly_biased = di_before < 0.8
    clearly_fixed = di_after > 0.8
    total_time = time.time() - t_total

    print(f"  5. Improvement: +{improvement:.4f}")
    print(f"     Before < 0.8 (biased): {clearly_biased}")
    print(f"     After > 0.8 (fixed): {clearly_fixed}")
    print(f"     Total time: {total_time:.1f}s")

    # Strategy order verification
    print(f"\n  Strategy order (best first):")
    for i, s in enumerate(strategies):
        di_s = s["fairness_after"]["disparate_impact"]
        gain = s.get("disparate_impact_gain", 0)
        rec = " [RECOMMENDED]" if s.get("recommended") else ""
        print(f"    {i+1}. {s['title']}: DI={di_s:.4f} gain={gain:.4f}{rec}")

    results.append({
        "run": run,
        "di_before": round(di_before, 4),
        "di_after": round(di_after, 4),
        "best_strategy": best_title,
        "eeoc": eeoc,
        "total_time": round(total_time, 1),
        "clearly_biased": clearly_biased,
        "clearly_fixed": clearly_fixed,
    })

# FINAL VERDICT
print(f"\n{'='*60}")
print(f"  FINAL VERDICT")
print(f"{'='*60}")

# Check all runs identical
all_identical = (
    len(set(r["di_before"] for r in results)) == 1 and
    len(set(r["di_after"] for r in results)) == 1 and
    len(set(r["best_strategy"] for r in results)) == 1
)
all_biased = all(r["clearly_biased"] for r in results)
all_fixed = all(r["clearly_fixed"] for r in results)
all_eeoc = all(r["eeoc"] for r in results)

print(f"  3/3 runs identical outputs : {'YES' if all_identical else 'NO'}")
print(f"  Before DI < 0.8 (biased)   : {'YES' if all_biased else 'NO'} (DI={results[0]['di_before']})")
print(f"  After DI > 0.8 (fixed)     : {'YES' if all_fixed else 'NO'} (DI={results[0]['di_after']})")
print(f"  EEOC compliant after fix   : {'YES' if all_eeoc else 'NO'}")
print(f"  Best strategy              : {results[0]['best_strategy']}")
print(f"  Avg total time             : {sum(r['total_time'] for r in results)/3:.1f}s")
print(f"  Confidence                 : {'10/10' if all_identical and all_biased and all_fixed else 'NEEDS FIX'}")
print(f"{'='*60}")
