"""JobManager - In-memory job state management for FairLens SSE streaming."""

import asyncio
import time
import logging
from dataclasses import dataclass, field
from typing import Callable, Any
from enum import Enum

logger = logging.getLogger(__name__)


class JobStage(str, Enum):
    """Audit pipeline stages in order."""
    WAITING = "waiting"
    INGESTION = "ingestion"
    PROFILING = "profiling"
    METRICS = "metrics"
    SHAP = "shap"
    COUNTERFACTUALS = "counterfactuals"
    REGULATORY = "regulatory"
    DONE = "done"
    ERROR = "error"


# Stage progress mapping (0-100)
STAGE_PROGRESS = {
    JobStage.WAITING: 0,
    JobStage.INGESTION: 10,
    JobStage.PROFILING: 25,
    JobStage.METRICS: 40,
    JobStage.SHAP: 60,
    JobStage.COUNTERFACTUALS: 75,
    JobStage.REGULATORY: 90,
    JobStage.DONE: 100,
    JobStage.ERROR: 100,
}

# User-friendly messages for each stage
STAGE_MESSAGES = {
    JobStage.WAITING: "Waiting to start...",
    JobStage.INGESTION: "Loading and validating dataset...",
    JobStage.PROFILING: "Detecting protected attributes...",
    JobStage.METRICS: "Computing fairness metrics (demographic parity, equalized odds)...",
    JobStage.SHAP: "Running SHAP feature importance analysis...",
    JobStage.COUNTERFACTUALS: "Generating counterfactual explanations...",
    JobStage.REGULATORY: "Checking regulatory compliance (EEOC, GDPR)...",
    JobStage.DONE: "Audit complete!",
    JobStage.ERROR: "Audit failed.",
}


@dataclass
class JobState:
    """Represents the current state of an audit job."""
    job_id: str
    status: str = "pending"  # pending, running, completed, failed
    stage: JobStage = JobStage.WAITING
    progress: int = 0
    message: str = "Waiting to start..."
    result: dict | None = None
    error: str | None = None
    df: Any = field(default=None, repr=False)  # In-memory DataFrame storage
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    timings: dict = field(default_factory=dict)

    def to_sse_payload(self) -> dict:
        """Convert to SSE event payload with done/result fields."""
        return {
            "stage": self.stage.value,
            "progress": self.progress,
            "message": self.message,
            "done": self.stage == JobStage.DONE,
            "result": self.result,
        }

    def update_stage(self, stage: JobStage, message: str | None = None):
        """Update job to a new stage."""
        self.stage = stage
        self.progress = STAGE_PROGRESS.get(stage, 0)
        self.message = message or STAGE_MESSAGES.get(stage, "Processing...")
        self.updated_at = time.time()
        if stage == JobStage.DONE:
            self.status = "completed"
        elif stage == JobStage.ERROR:
            self.status = "failed"
        elif stage == JobStage.WAITING:
            self.status = "pending"
        else:
            self.status = "running"

    def record_timing(self, stage: JobStage, duration: float):
        """Record timing for a completed stage."""
        self.timings[stage.value] = round(duration, 3)


class JobManager:
    """Manages in-memory job state and DataFrame storage for SSE streaming."""

    def __init__(self):
        self._jobs: dict[str, JobState] = {}
        self._lock = asyncio.Lock()

    async def create_job(self, job_id: str, df: Any = None) -> JobState:
        """Initialize a new job with optional DataFrame."""
        async with self._lock:
            job = JobState(
                job_id=job_id,
                status="pending",
                stage=JobStage.WAITING,
                progress=0,
                message="Waiting to start...",
                df=df,
            )
            self._jobs[job_id] = job
            logger.info(f"[JobManager] Created job {job_id}")
            return job

    async def get_job(self, job_id: str) -> JobState | None:
        """Get job by ID."""
        return self._jobs.get(job_id)

    async def update_job_stage(self, job_id: str, stage: JobStage, message: str | None = None):
        """Update job stage."""
        async with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update_stage(stage, message)
                logger.debug(f"[JobManager] Job {job_id} -> {stage.value}")

    async def complete_job(self, job_id: str, result: dict):
        """Mark job as completed with result."""
        async with self._lock:
            if job_id in self._jobs:
                job = self._jobs[job_id]
                job.update_stage(JobStage.DONE)
                job.result = result
                job.status = "completed"
                logger.info(f"[JobManager] Job {job_id} completed in {time.time() - job.created_at:.2f}s")

    async def fail_job(self, job_id: str, error: str):
        """Mark job as failed."""
        async with self._lock:
            if job_id in self._jobs:
                job = self._jobs[job_id]
                job.update_stage(JobStage.ERROR)
                job.error = error
                logger.error(f"[JobManager] Job {job_id} failed: {error}")

    async def record_stage_timing(self, job_id: str, stage: JobStage, duration: float):
        """Record timing for a stage."""
        async with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].record_timing(stage, duration)

    async def remove_job(self, job_id: str):
        """Remove job from memory."""
        async with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                logger.info(f"[JobManager] Removed job {job_id}")

    async def cleanup_job(self, job_id: str):
        """Alias for remove_job."""
        await self.remove_job(job_id)

    def list_jobs(self) -> dict[str, JobState]:
        """List all active jobs (for debugging)."""
        return self._jobs.copy()

    async def cleanup_old_jobs(self, max_age_seconds: float = 3600.0):
        """Remove jobs older than max_age_seconds."""
        now = time.time()
        async with self._lock:
            expired = [
                job_id for job_id, job in self._jobs.items()
                if (now - job.created_at) > max_age_seconds
            ]
            for job_id in expired:
                del self._jobs[job_id]
                logger.info(f"[JobManager] Cleaned up stale job {job_id}")
            return len(expired)

    def get_all_jobs(self) -> dict[str, JobState]:
        """Get all jobs (for debugging)."""
        return self._jobs.copy()


# Global singleton instance
job_manager = JobManager()
