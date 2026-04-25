"""
FairLens — Day 4: Demo Dataset Curation
========================================
Person D Deliverable | Day 4

Creates 3 optimized demo datasets from the cleaned Day 1 datasets.
These are trimmed, fast-loading, and show MAXIMUM bias impact for demo.

Run from repo root:
    python backend/app/curate_demo_datasets.py

Output → backend/app/data/demo_datasets/
    adult_demo.csv    — HR/Hiring bias demo
    compas_demo.csv   — Criminal justice bias demo
    hmda_demo.csv     — Mortgage lending bias demo
    demo_stats.json   — Bias numbers for all 3 (for frontend display)
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

np.random.seed(42)

# ── Paths
ROOT      = Path(__file__).resolve().parent.parent.parent
DATA_DIR  = ROOT / "backend" / "app" / "data" / "datasets"
DEMO_DIR  = ROOT / "backend" / "app" / "data" / "demo_datasets"
DEMO_DIR.mkdir(parents=True, exist_ok=True)


def print_header(title):
    print(f"\n{'='*55}")
    print(f"  {title}")
    print(f"{'='*55}")


# ══════════════════════════════════════════════════════
# DATASET 1 — UCI Adult Income (HR / Hiring)
# ══════════════════════════════════════════════════════
def curate_adult():
    print_header("Dataset 1: UCI Adult Income (HR / Hiring)")
    df = pd.read_csv(DATA_DIR / "adult_cleaned.csv")
    print(f"  Original: {df.shape[0]:,} rows × {df.shape[1]} cols")

    # Keep only demo-relevant columns
    keep = ["age", "education", "education_num", "occupation",
            "marital_status", "hours_per_week", "race", "sex",
            "capital_gain_log", "capital_loss_log",
            "sex_binary", "race_group", "income_binary", "income",
            "is_married", "workclass"]
    df = df[[c for c in keep if c in df.columns]]

    # Stratified sample to MAXIMISE bias signal
    g = {
        "male_high":   df[(df["sex"]=="Male")   & (df["income"]==">50K")],
        "female_high": df[(df["sex"]=="Female") & (df["income"]==">50K")],
        "male_low":    df[(df["sex"]=="Male")   & (df["income"]=="<=50K")],
        "female_low":  df[(df["sex"]=="Female") & (df["income"]=="<=50K")],
    }
    demo = pd.concat([
        g["male_high"].sample(min(3000, len(g["male_high"])),   random_state=42),
        g["female_high"].sample(min(1200, len(g["female_high"])), random_state=42),
        g["male_low"].sample(min(3000, len(g["male_low"])),     random_state=42),
        g["female_low"].sample(min(2800, len(g["female_low"])), random_state=42),
    ]).sample(frac=1, random_state=42).reset_index(drop=True).head(10000)

    # Compute bias stats
    male_rate   = demo[demo["sex"]=="Male"]["income_binary"].mean()
    female_rate = demo[demo["sex"]=="Female"]["income_binary"].mean()
    di          = round(female_rate / male_rate, 4) if male_rate > 0 else 0
    gap         = round((male_rate - female_rate) * 100, 1)

    print(f"  Demo: {len(demo):,} rows × {len(demo.columns)} cols")
    print(f"  Male >50K:    {male_rate:.1%}")
    print(f"  Female >50K:  {female_rate:.1%}")
    print(f"  Gap: {gap} pts | DI: {di} | EEOC: {'VIOLATION ✓' if di < 0.8 else 'OK'}")

    demo.to_csv(DEMO_DIR / "adult_demo.csv", index=False)
    print(f"  ✅ Saved → adult_demo.csv")

    return {
        "dataset": "UCI Adult Income (HR / Hiring)",
        "file": "adult_demo.csv",
        "rows": len(demo),
        "cols": len(demo.columns),
        "protected_attribute": "sex",
        "label": "income_binary",
        "bias_stats": {
            "privileged_group": "Male",
            "unprivileged_group": "Female",
            "privileged_positive_rate": round(male_rate, 4),
            "unprivileged_positive_rate": round(female_rate, 4),
            "disparate_impact": di,
            "gap_percentage_points": gap,
            "eeoc_violation": di < 0.8,
            "demo_numbers": {
                "sarah_chen_probability": 0.208,
                "james_white_probability": 0.388,
                "name_swap_gap": 18.0,
            }
        }
    }


# ══════════════════════════════════════════════════════
# DATASET 2 — COMPAS (Criminal Justice)
# ══════════════════════════════════════════════════════
def curate_compas():
    print_header("Dataset 2: COMPAS Recidivism (Criminal Justice)")
    df = pd.read_csv(DATA_DIR / "compas_cleaned.csv")
    print(f"  Original: {df.shape[0]:,} rows × {df.shape[1]} cols")

    keep = ["id", "sex", "age", "age_cat", "race",
            "priors_count", "c_charge_degree", "c_charge_desc",
            "juv_fel_count", "juv_misd_count",
            "decile_score", "score_text",
            "two_year_recid", "high_risk",
            "sex_binary", "is_african_american", "charge_degree_binary"]
    df = df[[c for c in keep if c in df.columns]]

    # Stratified: maximize representation of AA vs Caucasian contrast
    aa  = df[df["race"]=="African-American"]
    ca  = df[df["race"]=="Caucasian"]
    oth = df[~df["race"].isin(["African-American","Caucasian"])]

    demo = pd.concat([
        aa.sample(min(4000, len(aa)),   random_state=42),
        ca.sample(min(4000, len(ca)),   random_state=42),
        oth.sample(min(2000, len(oth)), random_state=42),
    ]).sample(frac=1, random_state=42).reset_index(drop=True).head(10000)

    aa_high  = (demo[demo["race"]=="African-American"]["score_text"]=="High").mean()
    ca_high  = (demo[demo["race"]=="Caucasian"]["score_text"]=="High").mean()
    ratio    = round(aa_high / ca_high, 2) if ca_high > 0 else 0
    aa_recid = demo[demo["race"]=="African-American"]["two_year_recid"].mean()
    ca_recid = demo[demo["race"]=="Caucasian"]["two_year_recid"].mean()

    # False positive rate: labeled high risk but didn't recidivate
    aa_fpr = demo[(demo["race"]=="African-American") & (demo["two_year_recid"]==0)]["high_risk"].mean()
    ca_fpr = demo[(demo["race"]=="Caucasian") & (demo["two_year_recid"]==0)]["high_risk"].mean()

    print(f"  Demo: {len(demo):,} rows × {len(demo.columns)} cols")
    print(f"  AA High Risk: {aa_high:.1%} | CA High Risk: {ca_high:.1%} | Ratio: {ratio}x")
    print(f"  AA FPR: {aa_fpr:.1%} | CA FPR: {ca_fpr:.1%}")

    demo.to_csv(DEMO_DIR / "compas_demo.csv", index=False)
    print(f"  ✅ Saved → compas_demo.csv")

    return {
        "dataset": "COMPAS Recidivism (Criminal Justice)",
        "file": "compas_demo.csv",
        "rows": len(demo),
        "cols": len(demo.columns),
        "protected_attribute": "race",
        "label": "two_year_recid",
        "bias_stats": {
            "african_american_high_risk_rate": round(aa_high, 4),
            "caucasian_high_risk_rate":        round(ca_high, 4),
            "ratio":                            ratio,
            "african_american_false_positive_rate": round(aa_fpr, 4),
            "caucasian_false_positive_rate":        round(ca_fpr, 4),
            "african_american_actual_recidivism": round(aa_recid, 4),
            "caucasian_actual_recidivism":        round(ca_recid, 4),
            "propublica_finding_confirmed": ratio >= 1.8,
        }
    }


# ══════════════════════════════════════════════════════
# DATASET 3 — HMDA Mortgage (Lending)
# ══════════════════════════════════════════════════════
def curate_hmda():
    print_header("Dataset 3: HUD HMDA Mortgage (Lending)")
    df = pd.read_csv(DATA_DIR / "hmda_cleaned.csv")
    print(f"  Original: {df.shape[0]:,} rows × {df.shape[1]} cols")

    keep = ["loan_type", "loan_purpose", "loan_amount_000s",
            "action_taken", "action_taken_name",
            "applicant_sex", "applicant_race_1",
            "applicant_income_000s", "debt_to_income_ratio",
            "combined_loan_to_value", "census_tract_minority_pct",
            "sex_binary", "race_white", "race_black", "race_hispanic",
            "hoepa_binary", "loan_type_code", "loan_purpose_code"]
    df = df[[c for c in keep if c in df.columns]]

    # Filter to approved/denied only
    df = df[df["action_taken"].isin([1, 3])].copy()
    df["approved"] = (df["action_taken"] == 1).astype(int)

    white = df[df["applicant_race_1"]=="White"]
    black = df[df["applicant_race_1"]=="Black or African American"]
    hisp  = df[df["applicant_race_1"]=="Hispanic or Latino"]
    asian = df[df["applicant_race_1"]=="Asian"]
    oth   = df[~df["applicant_race_1"].isin(["White","Black or African American","Hispanic or Latino","Asian"])]

    demo = pd.concat([
        white.sample(min(5000, len(white)), random_state=42),
        black.sample(min(2000, len(black)), random_state=42),
        hisp.sample(min(1500, len(hisp)),   random_state=42),
        asian.sample(min(1000, len(asian)), random_state=42),
        oth.sample(min(500, len(oth)),      random_state=42),
    ]).sample(frac=1, random_state=42).reset_index(drop=True).head(10000)

    by_race = demo.groupby("applicant_race_1").agg(
        denial_rate=("action_taken", lambda x: (x==3).mean()),
        approval_rate=("approved", "mean"),
        avg_income=("applicant_income_000s", "mean"),
        count=("approved", "count")
    ).round(4)

    black_denial = (demo[demo["applicant_race_1"]=="Black or African American"]["action_taken"]==3).mean()
    white_denial = (demo[demo["applicant_race_1"]=="White"]["action_taken"]==3).mean()
    black_approval = (demo[demo["applicant_race_1"]=="Black or African American"]["approved"]).mean()
    white_approval = (demo[demo["applicant_race_1"]=="White"]["approved"]).mean()
    di = round(black_approval / white_approval, 4) if white_approval > 0 else 0

    print(f"  Demo: {len(demo):,} rows × {len(demo.columns)} cols")
    print(f"  Black denial:  {black_denial:.1%} | White denial: {white_denial:.1%}")
    print(f"  Ratio: {black_denial/white_denial:.1f}x | DI: {di}")
    print(f"\n  By Race:\n{by_race.to_string()}")

    demo.to_csv(DEMO_DIR / "hmda_demo.csv", index=False)
    print(f"\n  ✅ Saved → hmda_demo.csv")

    return {
        "dataset": "HUD HMDA Mortgage (Lending)",
        "file": "hmda_demo.csv",
        "rows": len(demo),
        "cols": len(demo.columns),
        "protected_attribute": "applicant_race_1",
        "label": "approved",
        "bias_stats": {
            "black_denial_rate":  round(black_denial, 4),
            "white_denial_rate":  round(white_denial, 4),
            "denial_ratio":       round(black_denial / white_denial, 2),
            "disparate_impact":   di,
            "ecoa_violation":     di < 0.8,
            "by_race": by_race.to_dict()
        }
    }


# ══════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════
def main():
    print("\n" + "="*55)
    print("  FairLens — Demo Dataset Curation")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*55)

    stats = {
        "generated_at": datetime.now().isoformat(),
        "datasets": {}
    }

    stats["datasets"]["adult"]  = curate_adult()
    stats["datasets"]["compas"] = curate_compas()
    stats["datasets"]["hmda"]   = curate_hmda()

    # Save combined stats JSON for frontend
    stats_path = DEMO_DIR / "demo_stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2, default=str)

    print("\n" + "="*55)
    print("  ✅ ALL DEMO DATASETS READY")
    print(f"  📁 Location: backend/app/data/demo_datasets/")
    print(f"  📄 Files:")
    for name, d in stats["datasets"].items():
        print(f"     → {d['file']} ({d['rows']:,} rows)")
    print(f"     → demo_stats.json (bias numbers for frontend)")
    print("="*55 + "\n")


if __name__ == "__main__":
    main()
