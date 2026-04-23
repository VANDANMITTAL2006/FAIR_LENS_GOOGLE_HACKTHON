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

### POST `/audit`

Returns the fairness metrics contract used by the frontend dashboard.

Core response fields:

- `disparate_impact`
- `statistical_parity_diff`
- `equalized_odds_diff`
- `predictive_parity_diff`
- `group_metrics`
- `eeoc_threshold_breach`
- `top_shap_features`
- `regulatory_violations`

## Status Codes

- `200` for successful responses
- `400` for invalid files or malformed upload payloads
