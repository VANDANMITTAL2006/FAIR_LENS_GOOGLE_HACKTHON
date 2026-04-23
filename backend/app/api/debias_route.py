"""
FairLens — /debias FastAPI Route
==================================
Person A: Wire this into your main FastAPI app.
Add this to backend/app/api/routes.py or wherever your routes live.

Usage:
    from app.api.debias_route import router as debias_router
    app.include_router(debias_router)

Then call from frontend:
    POST /api/debias
    Body: { "dataset": "adult", "strategy": "all" }
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import json
import os

# Import the debiasing engine
from app.services.debiasing_engine import run_all_strategies

router = APIRouter(prefix="/api", tags=["debiasing"])

# ── Request / Response models
class DebiasRequest(BaseModel):
    dataset: str                         # "adult" | "compas" | "hmda"
    label_col: Optional[str]    = None   # auto-detected if not provided
    protected_col: Optional[str] = None  # auto-detected if not provided
    privileged_group: Optional[str] = None

# Dataset config — maps frontend dataset name → CSV config
DATASET_CONFIG = {
    "adult": {
        "file":             "adult_cleaned.csv",
        "label_col":        "income_binary",
        "protected_col":    "sex_binary",
        "privileged_group": "1",
        "name":             "UCI Adult Income (HR / Hiring)"
    },
    "compas": {
        "file":             "compas_cleaned.csv",
        "label_col":        "two_year_recid",
        "protected_col":    "is_african_american",
        "privileged_group": "0",
        "name":             "COMPAS Recidivism (Criminal Justice)"
    },
    "hmda": {
        "file":             "hmda_cleaned.csv",
        "label_col":        "action_taken",
        "protected_col":    "race_black",
        "privileged_group": "0",
        "name":             "HUD HMDA Mortgage (Lending)",
        "filter":           {"action_taken": [1, 3]},
        "remap_label":      {1: 1, 3: 0}
    },
}

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "datasets")
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "precomputed")


@router.post("/debias")
async def debias_dataset(request: DebiasRequest):
    """
    Run all 3 debiasing strategies on a dataset.
    Returns accuracy/fairness tradeoff for each strategy.

    Example request:
        POST /api/debias
        { "dataset": "adult" }
    """
    dataset_key = request.dataset.lower()

    # ── Try to serve from pre-computed cache first (fast)
    cache_file = os.path.join(CACHE_DIR, f"{dataset_key}_cleaned_debiasing.json")
    if os.path.exists(cache_file):
        with open(cache_file) as f:
            return json.load(f)

    # ── Otherwise, run live
    if dataset_key not in DATASET_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown dataset '{dataset_key}'. Choose from: {list(DATASET_CONFIG.keys())}"
        )

    cfg = DATASET_CONFIG[dataset_key]
    fpath = os.path.join(DATA_DIR, cfg["file"])

    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail=f"Dataset file not found: {cfg['file']}")

    df = pd.read_csv(fpath)

    # Apply filters
    if "filter" in cfg:
        for col, vals in cfg["filter"].items():
            df = df[df[col].isin(vals)].copy()
    if "remap_label" in cfg:
        df[cfg["label_col"]] = df[cfg["label_col"]].map(cfg["remap_label"])

    # Allow request overrides
    label_col        = request.label_col        or cfg["label_col"]
    protected_col    = request.protected_col    or cfg["protected_col"]
    privileged_group = request.privileged_group or cfg["privileged_group"]

    result = run_all_strategies(
        df,
        label_col        = label_col,
        protected_col    = protected_col,
        privileged_group = privileged_group,
        dataset_name     = cfg["name"]
    )

    # Cache for next time
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(cache_file, "w") as f:
        json.dump(result, f, indent=2)

    return result


@router.get("/debias/strategies")
async def list_strategies():
    """Return available debiasing strategies with descriptions."""
    return {
        "strategies": [
            {
                "id":          "reweighting",
                "name":        "Reweighting",
                "description": "Assigns higher training weights to under-represented groups.",
                "speed":       "Fast",
                "accuracy_impact": "Low (~1-2% loss)",
                "fairness_impact": "High"
            },
            {
                "id":          "threshold_adjustment",
                "name":        "Threshold Adjustment",
                "description": "Uses different decision thresholds per group to equalise outcomes.",
                "speed":       "Very Fast (post-processing, no retraining)",
                "accuracy_impact": "Medium (~1-3% loss)",
                "fairness_impact": "Very High"
            },
            {
                "id":          "feature_removal",
                "name":        "Feature Removal",
                "description": "Removes proxy features correlated with protected attributes.",
                "speed":       "Medium",
                "accuracy_impact": "Low-Medium (~1-3% loss)",
                "fairness_impact": "Medium-High"
            }
        ]
    }
