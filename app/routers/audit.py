from io import BytesIO
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, File, Query, UploadFile

from app.config.paths import UPLOAD_DIR
from app.services.audit_service import build_failure_contract, load_cached_audit, run_full_audit

router = APIRouter()


@router.post("/audit")
async def audit_endpoint(
    file: UploadFile | None = File(default=None),
    dataset: str | None = Query(default=None),
    upload_id: str | None = Query(default=None),
    use_cache: bool = Query(default=False),
    fast_mode: bool = Query(default=False),
):
    dataset_name = dataset or "uploaded_file"

    if use_cache and dataset and file is None and upload_id is None:
        cached = load_cached_audit(dataset)
        if cached is not None:
            cached["mode"] = {"cached": True, "fast": fast_mode}
            cached["component_status"]["cache"] = "hit"
            return cached
        return build_failure_contract(
            message="cached audit not found",
            detail=f"dataset={dataset}",
            dataset_name=dataset_name,
            cached=True,
            fast=fast_mode,
        )

    if file is None and upload_id:
        upload_path = Path(UPLOAD_DIR) / f"{upload_id}.csv"
        if upload_path.exists():
            try:
                df = pd.read_csv(upload_path)
            except Exception as exc:
                return build_failure_contract(
                    message="failed to read uploaded reference",
                    detail=str(exc),
                    dataset_name=dataset_name,
                    cached=use_cache,
                    fast=fast_mode,
                )

            if df.empty:
                return build_failure_contract(
                    message="dataset is empty",
                    dataset_name=dataset_name,
                    cached=use_cache,
                    fast=fast_mode,
                )

            try:
                return run_full_audit(
                    df,
                    dataset_name=inferred_dataset_from_reference(upload_id, dataset_name),
                    fast_mode=fast_mode,
                    cached_mode=False,
                )
            except Exception as exc:
                cached = load_cached_audit(dataset_name)
                if cached is not None:
                    cached["warnings"].append(f"live audit failed, fallback cache used: {exc}")
                    cached["mode"] = {"cached": True, "fast": fast_mode}
                    return cached
                return build_failure_contract(
                    message="audit execution failed",
                    detail=str(exc),
                    dataset_name=dataset_name,
                    cached=use_cache,
                    fast=fast_mode,
                )

    if file is None:
        return build_failure_contract(
            message="audit input missing",
            detail="upload a CSV file, pass upload_id, or set use_cache=true&dataset=<name>",
            dataset_name=dataset_name,
            cached=use_cache,
            fast=fast_mode,
        )

    try:
        data = await file.read()
    except Exception as exc:
        return build_failure_contract(
            message="file read failed",
            detail=str(exc),
            dataset_name=dataset_name,
            cached=use_cache,
            fast=fast_mode,
        )

    if not data:
        return build_failure_contract(
            message="file is empty",
            dataset_name=dataset_name,
            cached=use_cache,
            fast=fast_mode,
        )

    try:
        df = pd.read_csv(BytesIO(data))
    except Exception as exc:
        return build_failure_contract(
            message="invalid csv",
            detail=str(exc),
            dataset_name=dataset_name,
            cached=use_cache,
            fast=fast_mode,
        )

    if df.empty:
        return build_failure_contract(
            message="dataset is empty",
            dataset_name=dataset_name,
            cached=use_cache,
            fast=fast_mode,
        )

    inferred_dataset = dataset_name
    if inferred_dataset == "uploaded_file" and file.filename:
        inferred_dataset = file.filename.rsplit(".", 1)[0]

    try:
        result = run_full_audit(
            df,
            dataset_name=inferred_dataset,
            fast_mode=fast_mode,
            cached_mode=False,
        )
        if result.get("status") == "failed" and use_cache:
            cached = load_cached_audit(dataset_name)
            if cached is not None:
                cached["warnings"].append("live audit failed, fallback cache used")
                cached["mode"] = {"cached": True, "fast": fast_mode}
                return cached
        if use_cache and dataset and result["component_status"]["cache"] == "miss":
            result["warnings"].append("cache miss: computed live")
        return result
    except Exception as exc:
        return build_failure_contract(
            message="audit execution failed",
            detail=str(exc),
            dataset_name=inferred_dataset,
            cached=use_cache,
            fast=fast_mode,
        )


def inferred_dataset_from_reference(upload_id: str, dataset_name: str) -> str:
    if dataset_name and dataset_name != "uploaded_file":
        return dataset_name
    return f"upload_{upload_id[:8]}"
