from fastapi import APIRouter

router = APIRouter()


@router.post("/audit")
async def audit(body: dict):
    # STUB — Person C will replace internals. DO NOT change the response shape.
    return {
        "disparate_impact": 0.72,
        "statistical_parity_diff": -0.23,
        "equalized_odds_diff": -0.18,
        "predictive_parity_diff": -0.15,
        "group_metrics": {
            "female": {"selection_rate": 0.34, "sample_size": 4820},
            "male":   {"selection_rate": 0.57, "sample_size": 5180}
        },
        "eeoc_threshold_breach": True,
        "top_shap_features": [
            {"feature": "career_gap",   "impact": 0.31},
            {"feature": "college_name", "impact": 0.24},
            {"feature": "zipcode",      "impact": 0.19}
        ],
        "regulatory_violations": [
            "EEOC 4/5ths rule breached",
            "EU AI Act Article 10 — bias audit required"
        ]
    }
