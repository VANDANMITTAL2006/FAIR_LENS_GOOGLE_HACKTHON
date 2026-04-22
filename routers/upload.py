from fastapi import APIRouter, UploadFile
import pandas as pd

from modules.attribute_detector import detect_attributes

router = APIRouter()


@router.post("/upload")
async def upload(file: UploadFile):
    df = pd.read_csv(file.file)
    protected = detect_attributes(df)
    return {
        "rows": len(df),
        "columns": list(df.columns),
        "protected_attributes": protected,
        "filename": file.filename
    }
