import io
import json

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from ..models.schemas import UploadResponse
from ..services.attribute_detector import detect_attributes

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    data = await file.read()

    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(data))
        elif filename.endswith(".json"):
            payload = json.loads(data.decode("utf-8"))
            if isinstance(payload, dict) and "data" in payload:
                payload = payload["data"]
            if not isinstance(payload, list):
                raise HTTPException(
                    status_code=400,
                    detail="JSON must be an array of records or an object with a 'data' array.",
                )
            df = pd.DataFrame(payload)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a .csv or .json file.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse upload: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded file contains no rows.")

    protected = detect_attributes(df)
    return UploadResponse(
        rows=len(df),
        columns=list(df.columns),
        protected_attributes=protected,
        filename=file.filename,
    )
