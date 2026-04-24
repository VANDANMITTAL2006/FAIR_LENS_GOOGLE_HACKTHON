"""Trace the audit pipeline to see raw values at each stage."""
import pandas as pd
import json

# Create a test CSV with known bias
data = {
    "age": [25, 30, 35, 40, 45, 50, 55, 60, 25, 30, 35, 40, 45, 50, 55, 60, 25, 30, 35, 40],
    "sex": ["Male","Male","Male","Male","Male","Male","Male","Male","Male","Male",
            "Female","Female","Female","Female","Female","Female","Female","Female","Female","Female"],
    "income_binary": [1, 1, 1, 1, 1, 0, 1, 1, 0, 1,    # Males: 80% positive
                      0, 0, 0, 1, 0, 0, 0, 0, 1, 0],    # Females: 20% positive
}
df = pd.DataFrame(data)
df.to_csv("trace_test.csv", index=False)

print("=" * 60)
print("STAGE 1: RAW ML OUTPUT (audit_engine.audit)")
print("=" * 60)

from app.modules.audit_engine import audit
raw = audit(df)
print(json.dumps(raw, indent=2))

print("\n" + "=" * 60)
print("STAGE 2: SERVICE LAYER OUTPUT (run_full_audit)")
print("=" * 60)

from app.services.audit_service import run_full_audit
contract = run_full_audit(df)
print("metrics:", json.dumps(contract["metrics"], indent=2))
print("status:", contract["status"])
print("warnings:", contract["warnings"])

print("\n" + "=" * 60)
print("STAGE 3: FRONTEND WOULD RECEIVE")
print("=" * 60)
# Simulate what frontend does
m = contract.get("metrics", {})
dp = abs(float(m.get("demographic_parity_difference", 0))) * 100
eo = abs(float(m.get("equalized_odds_difference", 0))) * 100
pp = abs(float(m.get("predictive_parity_diff", 0))) * 100
di = float(m.get("disparate_impact_ratio", 1))
fairness_score = max(0, round(100 - (dp + eo) / 2))

print(f"Demographic Parity Gap: {dp:.2f}%")
print(f"Equalized Odds Gap:     {eo:.2f}%")
print(f"Predictive Parity Gap:  {pp:.2f}%")
print(f"Disparate Impact Ratio: {di:.3f}")
print(f"Fairness Score:         {fairness_score}/100")

import os
os.remove("trace_test.csv")
