import json

from fastapi import APIRouter, HTTPException, UploadFile
import pandas as pd

from modules.attribute_detector import detect_attributes

router = APIRouter()


@router.post("/upload")
async def upload(file: UploadFile):
    filename = (file.filename or "").lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        elif filename.endswith(".json"):
            payload = json.load(file.file)
            # Accept either a list of row objects or an envelope with a "data" list.
            if isinstance(payload, dict) and "data" in payload:
                payload = payload["data"]
            if not isinstance(payload, list):
                raise HTTPException(
                    status_code=400,
                    detail="JSON must be an array of records or an object with a 'data' array."
                )
            df = pd.DataFrame(payload)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload a .csv or .json file."
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse upload: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded file contains no rows.")

    protected = detect_attributes(df)
    return {
        "rows": len(df),
        "columns": list(df.columns),
        "protected_attributes": protected,
        "filename": file.filename
    }
