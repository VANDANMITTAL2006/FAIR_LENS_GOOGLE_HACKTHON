from fastapi import APIRouter, HTTPException, UploadFile, File
import pandas as pd
import json
from io import BytesIO

from modules.audit_engine import audit as run_audit
from modules.shap_explainer import explain
from modules.regulatory_radar import check_compliance
from modules.counterfactual import run_counterfactual

router = APIRouter()


@router.post("/audit")
async def audit_endpoint(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    df = pd.DataFrame()
    
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        elif filename.endswith(".json"):
            payload = json.load(file.file)
            if isinstance(payload, dict) and "data" in payload:
                payload = payload["data"]
            df = pd.DataFrame(payload)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .csv or .json file.")
            
        if df.empty:
            raise HTTPException(status_code=400, detail="Dataframe is empty.")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing input: {str(e)}")

    try:
        # Run ML Modules
        audit_results = run_audit(df)
        engine_metrics = audit_results.get("metrics", {})
        group_metrics = audit_results.get("group_metrics", {})
        
        shap_results = explain(df)
        compliance_results = check_compliance(engine_metrics)
        
        # Assemble Contract Response matching docs/metric_schema_contract.md
        response = {
            "disparate_impact": engine_metrics.get("disparate_impact_ratio", 1.0),
            "statistical_parity_diff": engine_metrics.get("demographic_parity_difference", 0.0),
            "equalized_odds_diff": engine_metrics.get("equalized_odds_difference", 0.0),
            "predictive_parity_diff": engine_metrics.get("predictive_parity_diff", 0.0),
            "group_metrics": group_metrics,
            "eeoc_threshold_breach": engine_metrics.get("disparate_impact_ratio", 1.0) < 0.8,
            "top_shap_features": shap_results.get("top_features", []),
            "regulatory_violations": compliance_results.get("violations", []),
            
            # Additional frontend attributes
            "dataset_name": audit_results.get("dataset_name"),
            "protected_attributes": audit_results.get("protected_attributes"),
            "risk_level": audit_results.get("risk_level"),
            "plain_english_summary": audit_results.get("plain_english_summary"),
            "group_difference_summary": shap_results.get("group_difference_summary")
        }
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

@router.post("/counterfactual")
async def counterfactual_endpoint(sample: dict):
    try:
        return run_counterfactual(sample)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Counterfactual failed: {str(e)}")
