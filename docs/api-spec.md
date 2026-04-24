# FAIR LENS API Specification

## Base URL

Local development:

- `http://127.0.0.1:8000`

## Endpoints

### GET `/health`

Returns service status.

Response:

```json
{ "status": "ok" }
```

### POST `/upload`

Accepts a file upload and returns dataset metadata.

Supported file types:

- CSV
- JSON as an array of records
- JSON as an object with a `data` array

Response fields:

- `rows`
- `columns`
- `protected_attributes`
- `filename`
- `upload_id` (used as reference in `/audit`)

### POST `/audit`

Returns the fairness metrics contract used by the frontend dashboard.

Accepted inputs:

- `file` (multipart CSV upload)
- `upload_id` query parameter returned by `/upload`
- `dataset` query parameter when requesting cached fallback

Core response fields:

- `metrics.demographic_parity_difference`
- `metrics.equalized_odds_difference`
- `metrics.predictive_parity_diff`
- `metrics.disparate_impact_ratio`
- `group_metrics`
- `group_comparison`
- `eeoc_threshold_breach`
- `top_shap_features`
- `shap_data`
- `counterfactual_data`
- `regulatory_violations`
- `regulatory_flags`

### POST `/api/debias`

Runs debiasing strategies on uploaded CSV data.

Form fields:

- `file`
- `label_col`
- `protected_col`
- `privileged_group`

Response fields:

- `recommended`
- `strategies[]`
- `summary`

## Status Codes

- `200` for successful responses
- `400` for invalid files or malformed upload payloads
