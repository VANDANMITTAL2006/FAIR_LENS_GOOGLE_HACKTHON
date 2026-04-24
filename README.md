# FAIR LENS

FAIR LENS is a monorepo for a bias-aware hiring fairness demo with a FastAPI backend and a Vite frontend.

## Repository Layout

- `backend/` contains the FastAPI application, services, and Pydantic models.
- `frontend/` contains the React UI.
- `docs/` contains the architecture, API, problem statement, and metric contract documentation.

## Backend Overview

The backend is organized as:

- `backend/app/api/` for HTTP routes
- `backend/app/core/` for config and settings
- `backend/app/services/` for business logic
- `backend/app/models/` for Pydantic schemas
- `backend/app/utils/` for helpers
- `backend/app/main.py` for the FastAPI app entrypoint

## What It Does

- Accepts CSV and JSON uploads and converts them into pandas DataFrames.
- Detects protected or proxy-sensitive attributes such as age, gender, race, and zipcode.
- Computes 4 fairness metrics from real labels/predictions (no random fallback).
- Returns a stable fairness audit JSON contract for the frontend dashboard.
- Provides debias strategy execution through `POST /api/debias`.
- Exposes a health endpoint for uptime checks.

## Run the Backend

From the repository root:

```bash
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

## Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [Architecture](docs/architecture.md)
- [API Spec](docs/api-spec.md)
- [Problem Statement](docs/problem-statement.md)
- [Metric Schema Contract](docs/metric_schema_contract.md)

## Notes

- Frontend flow is `upload -> audit -> debias` via `frontend/src/services/api.js`.
- `/audit` supports `upload_id` references returned by `/upload`.
