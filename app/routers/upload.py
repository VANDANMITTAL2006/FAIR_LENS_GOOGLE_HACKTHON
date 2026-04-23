from io import BytesIO
import json

import pandas as pd
from fastapi import APIRouter, File, UploadFile

from app.services.attribute_detector import detect_attributes
from app.utils.responses import error, success

router = APIRouter()


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    data = await file.read()

    if not data:
        return error("File is empty")

    try:
        if filename.endswith(".csv"):
            try:
                df = pd.read_csv(BytesIO(data))
            except Exception:
                return error("Invalid CSV")
        elif filename.endswith(".json"):
            payload = json.loads(data.decode("utf-8"))
            if isinstance(payload, dict) and "data" in payload:
                payload = payload["data"]
            if not isinstance(payload, list):
                return error("Invalid CSV", "JSON is not supported by this upload contract")
            df = pd.DataFrame(payload)
        else:
            return error("Invalid CSV", "Unsupported file type")
    except Exception as exc:
        return error("Invalid CSV", str(exc))

    if df.empty:
        return error("File is empty")

    protected = detect_attributes(df)
    return success(
        {
            "rows": len(df),
            "columns": list(df.columns),
            "protected_attributes": protected,
            "filename": file.filename,
        }
    )
