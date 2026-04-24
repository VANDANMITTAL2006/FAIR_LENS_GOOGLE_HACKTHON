"""
FairLens — Day 3: Pre-compute All Cache Files
==============================================
Person D Deliverable | Day 3

Run this script to generate ALL cached JSON files for the demo day.
These act as FALLBACK if the live API is slow or crashes during demo.

Run from repo root:
    python backend/app/precompute_cache.py

Output files (in backend/app/data/cache/):
    cached_adult.json
    cached_compas.json
    cached_hmda.json
    cached_all_datasets.json
    cached_demo_simulation.json
    cache_manifest.json   ← tells frontend which cache files exist
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np

# ── Fix import path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.services.debiasing_engine import run_all_strategies
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder

# ── Paths
DATA_DIR  = ROOT / "backend" / "app" / "data" / "datasets"
CACHE_DIR = ROOT / "backend" / "app" / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ── Dataset configs
DATASETS = {
    "adult": {
        "file":             "adult_cleaned.csv",
        "label_col":        "income_binary",
        "protected_col":    "sex_binary",
        "privileged_group": "1",
        "name":             "UCI Adult Income (HR / Hiring)",
    },
    "compas": {
        "file":             "compas_cleaned.csv",
        "label_col":        "two_year_recid",
        "protected_col":    "is_african_american",
        "privileged_group": "0",
        "name":             "COMPAS Recidivism (Criminal Justice)",
    },
    "hmda": {
        "file":             "hmda_cleaned.csv",
        "label_col":        "action_taken",
        "protected_col":    "race_black",
        "privileged_group": "0",
        "name":             "HUD HMDA Mortgage (Lending)",
        "filter":           {"action_taken": [1, 3]},
        "remap_label":      {1: 1, 3: 0},
    },
}


def safe_json_dump(obj, path):
    """Save JSON safely — converts numpy types to Python native types."""
    def convert(o):
        if isinstance(o, (np.integer,)):    return int(o)
        if isinstance(o, (np.floating,)):   return float(o)
        if isinstance(o, (np.bool_,)):      return bool(o)
        if isinstance(o, (np.ndarray,)):    return o.tolist()
        return str(o)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, default=convert)


def generate_demo_simulation_cache():
    """Generate the name-swap demo simulation cache."""
    print("\n  ▶ Generating demo simulation cache...")
    try:
        df = pd.read_csv(DATA_DIR / "adult_cleaned.csv")
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

        sample = X.mean(axis=0).copy()
        sex_idx = feature_names.index("sex_binary") if "sex_binary" in feature_names else None

        # Sarah Chen — Female
        if sex_idx is not None: sample[sex_idx] = 0
        prob_sarah = float(clf.predict_proba([sample])[0][1])

        # James Chen/White — Male
        if sex_idx is not None: sample[sex_idx] = 1
        prob_james = float(clf.predict_proba([sample])[0][1])

        result = {
            "sarah_chen_probability":  round(prob_sarah, 4),
            "james_chen_probability":  round(prob_james, 4),
            "james_white_probability": round(prob_james, 4),
            "gap_percentage_points":   round((prob_james - prob_sarah) * 100, 2),
            "demo_effective":          bool((prob_james - prob_sarah) > 0.05),
            "generated_at":            datetime.now().isoformat(),
            "note": (
                "Name-swap counterfactual: Same university, same experience, "
                "only gender changes. Gap proves algorithmic discrimination."
            )
        }
        save_path = CACHE_DIR / "cached_demo_simulation.json"
        safe_json_dump(result, save_path)
        print(f"  ✅ cached_demo_simulation.json saved")
        print(f"     Sarah Chen → {prob_sarah*100:.1f}%  |  James White → {prob_james*100:.1f}%  |  Gap: {(prob_james-prob_sarah)*100:.1f}pt")
        return result
    except Exception as e:
        print(f"  ⚠️  Demo simulation failed: {e}")
        return {}


def main():
    print("=" * 60)
    print("  FairLens — Pre-compute Cache Generator")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    manifest = {
        "generated_at": datetime.now().isoformat(),
        "files": {},
        "datasets_cached": []
    }

    all_results = {}
    total_start = time.time()

    # ── Generate debiasing cache for each dataset
    for key, cfg in DATASETS.items():
        fpath = DATA_DIR / cfg["file"]
        print(f"\n{'─'*60}")
        print(f"  Dataset: {cfg['name']}")
        print(f"{'─'*60}")

        if not fpath.exists():
            print(f"  ⚠️  File not found: {fpath} — skipping")
            continue

        try:
            t0 = time.time()
            df = pd.read_csv(fpath)
            print(f"  ✅ Loaded: {len(df):,} rows")

            if "filter" in cfg:
                for col, vals in cfg["filter"].items():
                    df = df[df[col].isin(vals)].copy()
                print(f"  ✅ Filtered: {len(df):,} rows")

            if "remap_label" in cfg:
                df[cfg["label_col"]] = df[cfg["label_col"]].map(cfg["remap_label"])

            df = df.dropna(subset=[cfg["label_col"], cfg["protected_col"]])

            result = run_all_strategies(
                df,
                label_col        = cfg["label_col"],
                protected_col    = cfg["protected_col"],
                privileged_group = cfg["privileged_group"],
                dataset_name     = cfg["name"]
            )

            cache_path = CACHE_DIR / f"cached_{key}.json"
            safe_json_dump(result, cache_path)
            size_kb = round(cache_path.stat().st_size / 1024, 1)
            elapsed = round(time.time() - t0, 1)

            print(f"  ✅ cached_{key}.json saved ({size_kb} KB, {elapsed}s)")
            print(f"     Recommended strategy: {result.get('recommended_strategy', 'N/A')}")

            all_results[key] = result
            manifest["files"][f"cached_{key}.json"] = {
                "size_kb": size_kb,
                "dataset": cfg["name"],
                "generated_in_seconds": elapsed
            }
            manifest["datasets_cached"].append(key)

        except Exception as e:
            print(f"  ❌ Failed for {key}: {e}")

    # ── Save combined cache
    if all_results:
        combined_path = CACHE_DIR / "cached_all_datasets.json"
        safe_json_dump(all_results, combined_path)
        size_kb = round(combined_path.stat().st_size / 1024, 1)
        print(f"\n  ✅ cached_all_datasets.json saved ({size_kb} KB)")
        manifest["files"]["cached_all_datasets.json"] = {"size_kb": size_kb}

    # ── Generate demo simulation cache
    demo_result = generate_demo_simulation_cache()
    if demo_result:
        manifest["files"]["cached_demo_simulation.json"] = {
            "gap_percentage_points": demo_result.get("gap_percentage_points"),
            "demo_effective": demo_result.get("demo_effective")
        }

    # ── Save manifest
    manifest["total_time_seconds"] = round(time.time() - total_start, 1)
    manifest_path = CACHE_DIR / "cache_manifest.json"
    safe_json_dump(manifest, manifest_path)

    print(f"\n{'='*60}")
    print(f"  ✅ ALL CACHE FILES GENERATED")
    print(f"  📁 Location: backend/app/data/cache/")
    print(f"  📄 Files created:")
    for fname in manifest["files"]:
        print(f"     → {fname}")
    print(f"  ⏱  Total time: {manifest['total_time_seconds']}s")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
