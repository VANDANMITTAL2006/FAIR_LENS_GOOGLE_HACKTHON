import asyncio
import json
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse

from app.config.paths import CACHED_PREFIX, DATA_DIR
from app.core.settings import settings
from app.modules.stream_steps import AUDIT_STEPS
from app.routers import audit_router, upload_router
from app.utils.responses import error, success
from backend.app.api.debias_route import router as debias_router

# Configure stdout encoding for Windows compatibility
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(audit_router)
app.include_router(debias_router)


@app.get("/audit-stream")
async def audit_stream():
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
    return success({"status": "ok"})
