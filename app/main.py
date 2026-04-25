"""
FairLens - AI Bias Audit Platform
Production-ready FastAPI backend with SSE streaming, performance optimization,
and pre-computed fallback for hackathon deployment.
"""

import asyncio
import json
import logging
import sys
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import AsyncGenerator

import pandas as pd
from fastapi import FastAPI, File, Query, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse, JSONResponse

from app.config.paths import CACHED_PREFIX, DATA_DIR, UPLOAD_DIR, PROJECT_ROOT
from app.core.job_manager import JobManager, JobStage, job_manager
from app.core.settings import settings
from app.modules.audit_engine import audit as audit_engine_audit
from app.modules.counterfactual import get_counterfactual
from app.modules.regulatory_radar import get_violations
from app.modules.shap_explainer import explain
from app.routers import audit_router, debias_router, upload_router
from app.services.run_store import RunStore
from app.utils.responses import error, success

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configure stdout encoding for Windows compatibility
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass

app = FastAPI(title=settings.app_name)

# Persisted run ledger (enterprise auditability)
RUN_DB_PATH = PROJECT_ROOT / "app" / "data" / "runs.db"
run_store = RunStore(RUN_DB_PATH)


def _next_run_id() -> str:
    # Minimal deterministic enterprise-style ID: AUD-000001+
    # Uses SQLite to avoid collisions and keep sequence stable.
    with run_store._connect() as conn:  # intentional internal use
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS run_seq (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              next_value INTEGER NOT NULL
            )
            """
        )
        row = conn.execute("SELECT next_value FROM run_seq WHERE id = 1").fetchone()
        if row is None:
            conn.execute("INSERT INTO run_seq (id, next_value) VALUES (1, 2)")
            n = 1
        else:
            n = int(row["next_value"])
            conn.execute("UPDATE run_seq SET next_value = ? WHERE id = 1", (n + 1,))
    return f"AUD-{n:05d}"

# Full CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Full CORS enabled for React frontend on Vercel
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Include existing routers for backward compatibility
app.include_router(upload_router)
app.include_router(audit_router)
app.include_router(debias_router)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def load_fallback_json(dataset_name: str) -> dict | None:
    """
    Load pre-computed audit JSON from fallback directory.
    Returns None if no real fallback file found (no hardcoded fake data).
    """
    base_names = [dataset_name, dataset_name.lower(), dataset_name.replace("_", "")]
    search_dirs = [
        Path("./app/data/fallback"),
        Path("./data/fallback"),
        Path("../data/fallback"),
        Path("./fallback"),
        Path(DATA_DIR) / "fallback",
    ]

    for search_dir in search_dirs:
        for base in base_names:
            path = search_dir / f"{base}_audit.json"
            if path.exists():
                try:
                    with path.open("r", encoding="utf-8") as f:
                        data = json.load(f)
                        logger.info(f"[Fallback] Loaded pre-computed audit from {path}")
                        return data
                except Exception as e:
                    logger.error(f"[Fallback] Failed to parse {path}: {e}")
                    continue

    return None  # No fake data — let caller handle the failure honestly


def _determine_dataset_name(df: pd.DataFrame) -> str:
    """Heuristically guess dataset name from column names."""
    cols = {c.lower() for c in df.columns}
    if "income" in cols or "income_binary" in cols or "capital_gain" in cols:
        return "uci_adult"
    if "two_year_recid" in cols or "recidivism" in cols or "juv_fel_count" in cols:
        return "compas"
    if "loan_amount" in cols or "action_taken" in cols or "hud" in cols or "hmda" in cols:
        return "hud_hmda"
    return "uci_adult"


def create_background_sample(df: pd.DataFrame, n: int = 100, random_state: int = 42) -> pd.DataFrame:
    """
    Create a background sample for SHAP optimization.
    
    Args:
        df: Input DataFrame
        n: Sample size (default 100)
        random_state: Random seed for reproducibility
    
    Returns:
        Sampled DataFrame with max n rows
    """
    sample_size = min(n, len(df))
    if sample_size < len(df):
        return df.sample(n=sample_size, random_state=random_state)
    return df.copy()


# ============================================================================
# ASYNC AUDIT PIPELINE WITH STAGE TRACKING
# ============================================================================

async def run_audit_pipeline(
    job_id: str,
    df: pd.DataFrame,
    dataset_name: str,
    fast_mode: bool = False
) -> dict:
    """
    Run the full audit pipeline with stage tracking and timing logs.
    Updates job state via job_manager as each stage completes.
    
    Args:
        job_id: Unique job identifier
        df: Input DataFrame
        dataset_name: Name of the dataset
        fast_mode: If True, skip ML-heavy components
    
    Returns:
        Complete audit result dict
    """
    contract = {
        "status": "failed",
        "dataset_name": dataset_name,
        "protected_attributes": [],
        "primary_protected": None,
        "risk_level": "Unknown",
        "plain_english_summary": "",
        "metrics": {
            "demographic_parity_difference": 0.0,
            "equalized_odds_difference": 0.0,
            "predictive_parity_diff": 0.0,
            "disparate_impact_ratio": 1.0,
        },
        "group_metrics": {},
        "group_comparison": [],
        "top_shap_features": [],
        "shap_data": {"top_features": [], "group_difference_summary": "", "status": "skipped"},
        "counterfactual": {},
        "counterfactual_data": {},
        "regulatory_violations": [],
        "regulatory_flags": [],
        "component_status": {
            "audit": "failed",
            "shap": "skipped",
            "counterfactual": "skipped",
            "regulatory": "skipped",
            "cache": "miss",
        },
        "mode": {"cached": False, "fast": fast_mode},
        "warnings": [],
        "timings": {},
    }
    
    # Stage 1: INGESTION
    await job_manager.update_job_stage(job_id, JobStage.INGESTION)
    job = await job_manager.get_job(job_id)
    if job and job.run_id:
        run_store.update_stage(job.run_id, status="running", stage=JobStage.INGESTION.value, progress=10)
    t_start = time.time()
    await asyncio.sleep(0.1)  # Simulate ingestion time
    contract["timings"]["ingestion"] = round(time.time() - t_start, 3)
    
    # Stage 2: PROFILING
    await job_manager.update_job_stage(job_id, JobStage.PROFILING)
    job = await job_manager.get_job(job_id)
    if job and job.run_id:
        run_store.update_stage(job.run_id, stage=JobStage.PROFILING.value, progress=25)
    t_start = time.time()
    
    # Create background sample for performance optimization
    background_sample = create_background_sample(df, n=100, random_state=42)
    
    contract["timings"]["profiling"] = round(time.time() - t_start, 3)
    
    # Stage 3: METRICS (core audit)
    await job_manager.update_job_stage(job_id, JobStage.METRICS)
    job = await job_manager.get_job(job_id)
    if job and job.run_id:
        run_store.update_stage(job.run_id, stage=JobStage.METRICS.value, progress=40)
    t_start = time.time()
    
    try:
        # Run audit_engine in thread pool to not block event loop
        audit_result = await asyncio.to_thread(
            audit_engine_audit,
            df,
            # If audit_engine supports background_df, uncomment below:
            # background_df=background_sample,
        )
        
        if isinstance(audit_result, dict):
            if audit_result.get("success") is False:
                contract["warnings"].append(f"Audit failed: {audit_result.get('error')}")
                contract["component_status"]["audit"] = "failed"
            else:
                # Merge audit results into contract
                contract["protected_attributes"] = audit_result.get("protected_attributes", [])
                contract["primary_protected"] = audit_result.get("primary_protected")
                contract["metrics"] = audit_result.get("metrics", contract["metrics"])
                contract["group_metrics"] = audit_result.get("group_metrics", {})
                contract["risk_level"] = audit_result.get("risk_level", "Unknown")
                contract["plain_english_summary"] = audit_result.get("plain_english_summary", "")
                contract["component_status"]["audit"] = "ok"
                
                # Build group_comparison
                contract["group_comparison"] = [
                    {
                        "group": group_name,
                        "selection_rate": values.get("selection_rate"),
                        "sample_size": values.get("sample_size"),
                    }
                    for group_name, values in contract["group_metrics"].items()
                    if isinstance(values, dict)
                ]
    except Exception as e:
        logger.error(f"[Audit] Error in metrics stage: {e}")
        contract["warnings"].append(f"Audit execution error: {e}")
        contract["component_status"]["audit"] = "failed"
    
    contract["timings"]["metrics"] = round(time.time() - t_start, 3)
    
    if fast_mode:
        contract["warnings"].append("Fast mode enabled: optional ML components skipped")
        contract["status"] = "ok" if contract["component_status"]["audit"] == "ok" else "partial"
    else:
        # Stage 4: SHAP
        await job_manager.update_job_stage(job_id, JobStage.SHAP)
        job = await job_manager.get_job(job_id)
        if job and job.run_id:
            run_store.update_stage(job.run_id, stage=JobStage.SHAP.value, progress=60)
        t_start = time.time()
        
        try:
            # Use background_sample for SHAP optimization
            shap_result = await asyncio.to_thread(explain, background_sample)
            if isinstance(shap_result, dict):
                top_features = shap_result.get("top_features", [])
                contract["top_shap_features"] = top_features if isinstance(top_features, list) else []
                contract["shap_data"] = shap_result
                contract["component_status"]["shap"] = "ok" if shap_result.get("status") == "ok" else "failed"
            else:
                contract["warnings"].append("SHAP output invalid")
                contract["component_status"]["shap"] = "failed"
        except Exception as e:
            logger.error(f"[Audit] SHAP failed: {e}")
            contract["warnings"].append(f"SHAP failed: {e}")
            contract["component_status"]["shap"] = "failed"
        
        contract["timings"]["shap"] = round(time.time() - t_start, 3)
        
        # Stage 5: COUNTERFACTUALS
        await job_manager.update_job_stage(job_id, JobStage.COUNTERFACTUALS)
        job = await job_manager.get_job(job_id)
        if job and job.run_id:
            run_store.update_stage(job.run_id, stage=JobStage.COUNTERFACTUALS.value, progress=75)
        t_start = time.time()
        
        try:
            cf_result = await asyncio.to_thread(get_counterfactual, background_sample)
            if isinstance(cf_result, dict):
                contract["counterfactual"] = cf_result
                contract["counterfactual_data"] = cf_result
                contract["component_status"]["counterfactual"] = "ok" if cf_result.get("status") == "ok" else "failed"
            else:
                contract["warnings"].append("Counterfactual output invalid")
                contract["component_status"]["counterfactual"] = "failed"
        except Exception as e:
            logger.error(f"[Audit] Counterfactual failed: {e}")
            contract["warnings"].append(f"Counterfactual failed: {e}")
            contract["component_status"]["counterfactual"] = "failed"
        
        contract["timings"]["counterfactuals"] = round(time.time() - t_start, 3)
        
        # Stage 6: REGULATORY
        await job_manager.update_job_stage(job_id, JobStage.REGULATORY)
        job = await job_manager.get_job(job_id)
        if job and job.run_id:
            run_store.update_stage(job.run_id, stage=JobStage.REGULATORY.value, progress=90)
        t_start = time.time()
        
        try:
            violations_result = await asyncio.to_thread(get_violations, contract["metrics"])
            if isinstance(violations_result, dict):
                violations = violations_result.get("violations", [])
                contract["regulatory_violations"] = violations if isinstance(violations, list) else []
                contract["regulatory_flags"] = contract["regulatory_violations"]
                contract["component_status"]["regulatory"] = "ok"
            else:
                contract["warnings"].append("Regulatory output invalid")
                contract["component_status"]["regulatory"] = "failed"
        except Exception as e:
            logger.error(f"[Audit] Regulatory failed: {e}")
            contract["warnings"].append(f"Regulatory failed: {e}")
            contract["component_status"]["regulatory"] = "failed"
        
        contract["timings"]["regulatory"] = round(time.time() - t_start, 3)
        
        # Determine overall status
        failed_components = [
            k for k, v in contract["component_status"].items()
            if v == "failed" and k != "cache"
        ]
        if failed_components:
            contract["status"] = "partial" if contract["component_status"]["audit"] == "ok" else "failed"
        elif contract["warnings"]:
            contract["status"] = "partial"
        else:
            contract["status"] = "ok"
    
    return contract


# ============================================================================
# SSE STREAMING ENDPOINT
# ============================================================================

@app.get("/audit/stream/{job_id}")
async def audit_stream_endpoint(job_id: str, request: Request) -> StreamingResponse:
    """
    SSE endpoint that streams audit progress events.
    
    Events are sent every 400ms with format:
    {"stage": "<name>", "progress": <0-100>, "message": "<user-friendly text>"}
    
    Final event: {"done": true, "result": <full audit dict>}
    """
    async def event_generator() -> AsyncGenerator[str, None]:
        job = await job_manager.get_job(job_id)
        if not job:
            # Job not found - yield error and close
            yield f'data: {json.dumps({"error": "Job not found", "stage": "error", "progress": 0})}\n\n'
            return
        
        last_stage = None
        last_progress = -1
        
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                logger.info(f"[SSE] Client disconnected for job {job_id}")
                break
            
            job = await job_manager.get_job(job_id)
            if not job:
                break
            
            # Only yield if stage or progress changed
            if job.stage != last_stage or job.progress != last_progress:
                last_stage = job.stage
                last_progress = job.progress
                
                event = job.to_sse_payload()
                yield f'data: {json.dumps(event)}\n\n'
                if job.stage == JobStage.DONE:
                    if job.run_id:
                        try:
                            run_store.complete(job.run_id, result=job.result or {})
                        except Exception as e:
                            logger.error(f"[RunLedger] Failed to mark complete for {job.run_id}: {e}")
                    break
                if job.stage == JobStage.ERROR:
                    if job.run_id:
                        try:
                            run_store.fail(job.run_id, error=job.error or "failed")
                        except Exception as e:
                            logger.error(f"[RunLedger] Failed to mark failed for {job.run_id}: {e}")
                    break
            
            # Stream every 400ms
            await asyncio.sleep(0.4)
        
        # Cleanup job after streaming completes
        await job_manager.cleanup_job(job_id)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream",
        },
    )



# ============================================================================
# NOTE: /upload and /audit endpoints are served by app/routers/upload.py
# and app/routers/audit.py (registered via include_router above).
# Do NOT add duplicate route definitions here.
# ============================================================================




# ============================================================================
# ASYNC AUDIT WITH SSE TRIGGER
# ============================================================================

@app.post("/audit/async")
async def audit_async(
    file: UploadFile | None = File(default=None),
    dataset: str | None = Query(default=None),
    upload_id: str | None = Query(default=None),
    fast_mode: bool = Query(default=False),
):
    """
    Start an async audit and return a job_id for SSE streaming.
    Client should then connect to GET /audit/stream/{job_id}
    """
    dataset_name = dataset or upload_id or "uploaded_file"
    df: pd.DataFrame | None = None
    job_id = uuid.uuid4().hex
    
    # Load DataFrame
    try:
        if file:
            data = await file.read()
            df = pd.read_csv(BytesIO(data))
            if file.filename:
                dataset_name = file.filename.rsplit(".", 1)[0]
        elif upload_id:
            upload_path = UPLOAD_DIR / f"{upload_id}.csv"
            if upload_path.exists():
                df = pd.read_csv(upload_path)
                dataset_name = f"upload_{upload_id[:8]}"
    except Exception as e:
        return error("Failed to load dataset", str(e))
    
    if df is None or df.empty:
        return error("No data provided")
    
    # Create job
    await job_manager.create_job(job_id)
    
    # Start audit in background (fire-and-forget)
    async def background_audit():
        try:
            result = await run_audit_pipeline(
                job_id=job_id,
                df=df,
                dataset_name=dataset_name,
                fast_mode=fast_mode,
            )
            await job_manager.complete_job(job_id, result)
        except Exception as e:
            logger.error(f"[AsyncAudit] Background audit failed: {e}")
            # Try fallback
            fallback = load_fallback_json(dataset_name)
            if fallback:
                await job_manager.complete_job(job_id, fallback)
            else:
                await job_manager.fail_job(job_id, str(e))
    
    # Run in background task
    asyncio.create_task(background_audit())
    
    return success({
        "job_id": job_id,
        "dataset_name": dataset_name,
        "rows": len(df),
        "message": "Audit started. Connect to /audit/stream/{job_id} for progress.",
    })


# ============================================================================
# LEGACY ENDPOINTS (Backward Compatibility)
# ============================================================================

@app.get("/audit-stream")
async def audit_stream_legacy():
    """Legacy demo endpoint - kept for backward compatibility."""
    from app.modules.stream_steps import AUDIT_STEPS
    
    async def event_generator():
        for index, step in enumerate(AUDIT_STEPS):
            yield f'data: {json.dumps({"status": step})}\n\n'
            if index < len(AUDIT_STEPS) - 1:
                await asyncio.sleep(1.2)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/cached-audit/{dataset_name}")
def cached_audit(dataset_name: str):
    """Get pre-computed audit from cache."""
    cache_path = Path(DATA_DIR) / f"{CACHED_PREFIX}{dataset_name}.json"
    
    if not cache_path.exists():
        return error("not found")
    
    with cache_path.open("r", encoding="utf-8") as handle:
        return success(json.load(handle))


@app.get("/")
def read_root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health():
    return success({"status": "ok", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})


@app.get("/jobs")
def list_jobs_endpoint():
    """Debug endpoint to list active jobs."""
    jobs = job_manager.list_jobs()
    return success({
        "active_jobs": len(jobs),
        "jobs": [
            {
                "job_id": j.job_id,
                "run_id": j.run_id,
                "status": j.status,
                "stage": j.stage.value,
                "progress": j.progress,
            }
            for j in jobs.values()
        ],
    })


# ============================================================================
# RUN LEDGER ENDPOINTS (Persisted Audit History)
# ============================================================================

@app.get("/runs")
def list_runs(limit: int = 50):
    return success({"runs": run_store.list_runs(limit=limit)})


@app.get("/runs/{run_id}")
def get_run(run_id: str):
    rec = run_store.get_run(run_id)
    if not rec:
        return error("not found", f"run_id={run_id}")
    return success(rec)
