from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import audit, upload
from .core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(audit.router)


@app.get("/health")
def health():
    return {"status": "ok"}
