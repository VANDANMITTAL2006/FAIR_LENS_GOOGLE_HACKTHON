from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import pandas as pd
import io

# Import the debiasing engine
from backend.app.services.debiasing_engine import run_all_strategies

router = APIRouter(prefix="/api", tags=["debiasing"])

@router.post("/debias")
async def debias_dataset(
    file: UploadFile = File(...),
    label_col: str = Form(...),
    protected_col: str = Form(...),
    privileged_group: str = Form(...)
):
    """
    Run all 3 debiasing strategies on an uploaded CSV dataset.
    """
    # 1. Validate empty file
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename provided.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 2. Convert to pandas DataFrame
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV contains no data rows.")

    # 3. Check for missing columns
    if label_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Label column '{label_col}' not found in CSV.")
    if protected_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Protected column '{protected_col}' not found in CSV.")

    # 4. Call debiasing_engine.py
    try:
        raw_result = run_all_strategies(
            df=df,
            label_col=label_col,
            protected_col=protected_col,
            privileged_group=privileged_group,
            dataset_name=file.filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal debiasing error: {str(e)}")

    # 5. Format Output
    strategies_list = []
    for strat_key, strat_data in raw_result.get("strategies", {}).items():
        if "error" in strat_data:
            continue
            
        strategies_list.append({
            "name": strat_key,
            "accuracy": strat_data.get("accuracy_after", 0.0),
            "bias_reduction": strat_data.get("fairness_improvement_pct", 0.0),
            "details": strat_data
        })

    return {
        "strategies": strategies_list,
        "recommended": raw_result.get("recommended_strategy")
    }

@router.get("/debias/strategies")
async def list_strategies():
    """Return available debiasing strategies with descriptions."""
    return {
        "strategies": [
            {
                "id":          "reweighting",
                "name":        "Reweighting",
                "description": "Assigns higher training weights to under-represented groups."
            },
            {
                "id":          "threshold_adjustment",
                "name":        "Threshold Adjustment",
                "description": "Uses different decision thresholds per group to equalise outcomes."
            },
            {
                "id":          "feature_removal",
                "name":        "Feature Removal",
                "description": "Removes proxy features correlated with protected attributes."
            }
        ]
    }
