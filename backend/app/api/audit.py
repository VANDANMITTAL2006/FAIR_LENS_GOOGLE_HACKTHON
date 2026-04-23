from fastapi import APIRouter

from ..models.schemas import AuditResponse, GroupMetric, TopShapFeature

router = APIRouter()


@router.post("/audit", response_model=AuditResponse)
async def audit(body: dict):
    # STUB — keep the response shape stable for the frontend contract.
    return AuditResponse(
        disparate_impact=0.72,
        statistical_parity_diff=-0.23,
        equalized_odds_diff=-0.18,
        predictive_parity_diff=-0.15,
        group_metrics={
            "female": GroupMetric(selection_rate=0.34, sample_size=4820),
            "male": GroupMetric(selection_rate=0.57, sample_size=5180),
        },
        eeoc_threshold_breach=True,
        top_shap_features=[
            TopShapFeature(feature="career_gap", impact=0.31),
            TopShapFeature(feature="college_name", impact=0.24),
            TopShapFeature(feature="zipcode", impact=0.19),
        ],
        regulatory_violations=[
            "EEOC 4/5ths rule breached",
            "EU AI Act Article 10 - bias audit required",
        ],
    )
