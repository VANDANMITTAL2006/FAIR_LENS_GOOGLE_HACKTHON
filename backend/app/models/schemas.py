from pydantic import BaseModel


class UploadResponse(BaseModel):
    rows: int
    columns: list[str]
    protected_attributes: list[str]
    filename: str | None


class GroupMetric(BaseModel):
    selection_rate: float
    sample_size: int


class TopShapFeature(BaseModel):
    feature: str
    impact: float


class AuditResponse(BaseModel):
    disparate_impact: float
    statistical_parity_diff: float
    equalized_odds_diff: float
    predictive_parity_diff: float
    group_metrics: dict[str, GroupMetric]
    eeoc_threshold_breach: bool
    top_shap_features: list[TopShapFeature]
    regulatory_violations: list[str]
