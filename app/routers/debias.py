from io import BytesIO

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.app.services.debiasing_engine import run_all_strategies

router = APIRouter(prefix="/api", tags=["debiasing"])


@router.post("/debias")
async def debias_dataset(
    file: UploadFile = File(...),
    label_col: str = Form(...),
    protected_col: str = Form(...),
    privileged_group: str = Form(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename provided.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        df = pd.read_csv(BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV contains no data rows.")

    if label_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Label column '{label_col}' not found in CSV.")
    if protected_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Protected column '{protected_col}' not found in CSV.")

    try:
        raw_result = run_all_strategies(
            df=df,
            label_col=label_col,
            protected_col=protected_col,
            privileged_group=privileged_group,
            dataset_name=file.filename,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal debiasing error: {exc}") from exc

    strategies = []
    for key, value in raw_result.get("strategies", {}).items():
        if not isinstance(value, dict) or "error" in value:
            continue

        strategies.append(
            {
                "id": key,
                "title": value.get("strategy", key.replace("_", " ").title()),
                "description": value.get("description", ""),
                "bestUseCase": value.get("how_it_works_simple", ""),
                "gain": f"{value.get('fairness_improvement_pct', 0)}%",
                "cost": f"{abs(value.get('accuracy_loss_pct', 0))}% accuracy tradeoff",
                "confidence": min(99, max(1, int(50 + value.get("disparate_impact_gain", 0) * 50))),
                "raw": value,
            }
        )

    return {
        "dataset": raw_result.get("dataset"),
        "recommended": raw_result.get("recommended_strategy"),
        "strategies": strategies,
        "summary": raw_result.get("summary", ""),
    }


@router.get("/debias/strategies")
async def list_strategies():
    return {
        "strategies": [
            {
                "id": "reweighting",
                "name": "Reweighting",
                "description": "Assigns higher training weights to under-represented groups.",
            },
            {
                "id": "threshold_adjustment",
                "name": "Threshold Adjustment",
                "description": "Uses different decision thresholds per group to equalize outcomes.",
            },
            {
                "id": "feature_removal",
                "name": "Feature Removal",
                "description": "Removes proxy features correlated with protected attributes.",
            },
        ]
    }
