from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import upload, audit

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(audit.router)


@app.get("/health")
def health():
    return {"status": "ok"}
