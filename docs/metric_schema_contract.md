# FAIR LENS Metric Schema Contract

This document defines the response contract for the audit metrics payload returned by `POST /audit`.

## Contract Goals

- Keep the payload shape stable for frontend integration.
- Provide fairness and compliance metrics in a predictable format.
- Allow backend internals to evolve without breaking consumers.

## JSON Structure

```json
{
  "disparate_impact": 0.72,
  "statistical_parity_diff": -0.23,
  "equalized_odds_diff": -0.18,
  "predictive_parity_diff": -0.15,
  "group_metrics": {
    "female": {
      "selection_rate": 0.34,
      "sample_size": 4820
    },
    "male": {
      "selection_rate": 0.57,
      "sample_size": 5180
    }
  },
  "eeoc_threshold_breach": true,
  "top_shap_features": [
    {
      "feature": "career_gap",
      "impact": 0.31
    },
    {
      "feature": "college_name",
      "impact": 0.24
    },
    {
      "feature": "zipcode",
      "impact": 0.19
    }
  ],
  "regulatory_violations": [
    "EEOC 4/5ths rule breached",
    "EU AI Act Article 10 - bias audit required"
  ]
}
```

## Field Definitions

- `disparate_impact` (number): Ratio of selection rates between protected and reference groups.
- `statistical_parity_diff` (number): Difference in positive outcome rates between groups.
- `equalized_odds_diff` (number): Gap in true/false positive rates across groups.
- `predictive_parity_diff` (number): Gap in positive predictive value across groups.
- `group_metrics` (object): Map of group name to group-specific metrics.
- `group_metrics.<group>.selection_rate` (number): Positive decision rate for the group.
- `group_metrics.<group>.sample_size` (integer): Number of records in the group.
- `eeoc_threshold_breach` (boolean): Indicates if EEOC 4/5ths threshold is violated.
- `top_shap_features` (array): Ranked model features contributing most to predictions.
- `top_shap_features[].feature` (string): Feature name.
- `top_shap_features[].impact` (number): Relative feature influence.
- `regulatory_violations` (array of strings): Compliance or policy warning messages.

## Backward Compatibility Rules

- Existing keys must not be removed or renamed.
- New keys may be added only as optional fields.
- Numeric metrics should remain numeric (not string-encoded).
