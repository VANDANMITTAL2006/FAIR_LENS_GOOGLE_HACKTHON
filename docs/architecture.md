# FAIR LENS Architecture

## Overview

FAIR LENS is organized as a monorepo with a Python backend and a React frontend.

## Backend Layout

- `backend/app/api/` contains HTTP routes.
- `backend/app/core/` contains configuration and app settings.
- `backend/app/services/` contains reusable business logic.
- `backend/app/models/` contains Pydantic schemas and response models.
- `backend/app/utils/` contains helper functions.
- `backend/app/main.py` creates the FastAPI app and registers routers.

## Frontend Layout

- `frontend/src/` contains the Vite UI implementation.
- `frontend/public/` contains static assets.

## Data Flow

1. A user uploads a CSV or JSON dataset in the frontend.
2. The backend `/upload` endpoint converts the file into a pandas DataFrame.
3. The service layer flags sensitive attributes such as gender, age, race, or zipcode proxy fields.
4. The `/audit` endpoint returns a stable fairness metrics contract for dashboard rendering.

## Design Goal

Keep the business logic isolated in `services`, keep transport concerns in `api`, and keep response contracts explicit in `models`.
