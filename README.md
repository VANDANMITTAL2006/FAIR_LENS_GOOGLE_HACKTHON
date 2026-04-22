# FAIR LENS Backend

FastAPI backend for FAIR LENS (Google Hackathon) to support bias-aware hiring pipeline workflows.

## What You Built

You implemented a backend service with:

- A FastAPI application entry point with CORS enabled for frontend integration.
- A CSV upload endpoint that reads candidate data and detects protected attributes.
- A fairness audit endpoint with a fixed response contract (currently stubbed metrics for integration).
- A health check endpoint for uptime verification.

## Project Structure

- `main.py` initializes FastAPI, middleware, and routers.
- `routers/upload.py` handles file upload and schema/attribute discovery.
- `modules/attribute_detector.py` contains protected-attribute detection logic.
- `routers/audit.py` returns audit metrics in a stable response shape.
- `requirements.txt` lists Python dependencies.

## API Endpoints

### GET `/health`
Returns service status.

Example response:
```json
{"status": "ok"}
```

### POST `/upload`
Accepts a CSV file and returns:
- Total rows
- Column list
- Detected protected attributes
- Original filename

### POST `/audit`
Returns fairness/bias metrics and model governance-style outputs (stubbed for now):
- Disparate impact
- Statistical parity difference
- Equalized odds difference
- Predictive parity difference
- Group-level selection metrics
- EEOC threshold breach flag
- Top contributing features
- Regulatory violation list

## Setup and Run

1. Create and activate a Python virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the server:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

4. Open docs:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

## Notes

- Current audit values are placeholder outputs designed for frontend and integration testing.
- The next step is to replace the audit stub with real fairness metric computation over model predictions and sensitive groups.
