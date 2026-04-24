import json
import sqlite3
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass
class RunRecord:
    run_id: str
    job_id: str
    status: str  # queued|running|completed|failed
    created_at: float
    updated_at: float
    completed_at: float | None = None
    duration_ms: int | None = None

    dataset_id: str | None = None
    dataset_name: str | None = None
    dataset_source: str | None = None

    model_id: str | None = None
    model_version: str | None = None
    policy_version: str | None = None

    stage: str | None = None
    progress: int | None = None

    risk_level: str | None = None
    metrics_json: str | None = None  # compact JSON
    error: str | None = None


class RunStore:
    """
    Minimal persisted run ledger (SQLite, stdlib only).
    Designed to make the product feel enterprise-real: run IDs, timestamps, status, traceability.
    """

    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                  run_id TEXT PRIMARY KEY,
                  job_id TEXT NOT NULL,
                  status TEXT NOT NULL,
                  created_at REAL NOT NULL,
                  updated_at REAL NOT NULL,
                  completed_at REAL,
                  duration_ms INTEGER,

                  dataset_id TEXT,
                  dataset_name TEXT,
                  dataset_source TEXT,

                  model_id TEXT,
                  model_version TEXT,
                  policy_version TEXT,

                  stage TEXT,
                  progress INTEGER,

                  risk_level TEXT,
                  metrics_json TEXT,
                  error TEXT
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_runs_job_id ON runs(job_id)")

    def _row_to_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        d = dict(row)
        # Keep JSON field as parsed object for API ergonomics
        if d.get("metrics_json"):
            try:
                d["metrics"] = json.loads(d["metrics_json"])
            except Exception:
                d["metrics"] = None
        else:
            d["metrics"] = None
        d.pop("metrics_json", None)
        return d

    def create_run(
        self,
        run_id: str,
        job_id: str,
        *,
        dataset_id: str | None = None,
        dataset_name: str | None = None,
        dataset_source: str | None = None,
        model_id: str | None = None,
        model_version: str | None = None,
        policy_version: str | None = None,
    ) -> None:
        now = time.time()
        rec = RunRecord(
            run_id=run_id,
            job_id=job_id,
            status="queued",
            created_at=now,
            updated_at=now,
            dataset_id=dataset_id,
            dataset_name=dataset_name,
            dataset_source=dataset_source,
            model_id=model_id,
            model_version=model_version,
            policy_version=policy_version,
        )
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO runs (
                  run_id, job_id, status, created_at, updated_at, completed_at, duration_ms,
                  dataset_id, dataset_name, dataset_source,
                  model_id, model_version, policy_version,
                  stage, progress, risk_level, metrics_json, error
                ) VALUES (
                  :run_id, :job_id, :status, :created_at, :updated_at, :completed_at, :duration_ms,
                  :dataset_id, :dataset_name, :dataset_source,
                  :model_id, :model_version, :policy_version,
                  :stage, :progress, :risk_level, :metrics_json, :error
                )
                """,
                asdict(rec),
            )

    def update_stage(self, run_id: str, *, status: str | None = None, stage: str | None = None, progress: int | None = None) -> None:
        now = time.time()
        fields: dict[str, Any] = {"run_id": run_id, "updated_at": now}
        sets = ["updated_at = :updated_at"]
        if status is not None:
            fields["status"] = status
            sets.append("status = :status")
        if stage is not None:
            fields["stage"] = stage
            sets.append("stage = :stage")
        if progress is not None:
            fields["progress"] = int(progress)
            sets.append("progress = :progress")
        with self._connect() as conn:
            conn.execute(f"UPDATE runs SET {', '.join(sets)} WHERE run_id = :run_id", fields)

    def complete(self, run_id: str, *, result: dict[str, Any] | None = None) -> None:
        now = time.time()
        metrics = (result or {}).get("metrics") if isinstance(result, dict) else None
        risk_level = (result or {}).get("risk_level") if isinstance(result, dict) else None
        with self._connect() as conn:
            row = conn.execute("SELECT created_at FROM runs WHERE run_id = ?", (run_id,)).fetchone()
            created = float(row["created_at"]) if row else now
            duration_ms = int(max(0.0, (now - created) * 1000))
            conn.execute(
                """
                UPDATE runs
                SET status = ?, updated_at = ?, completed_at = ?, duration_ms = ?,
                    stage = ?, progress = ?, risk_level = ?, metrics_json = ?, error = NULL
                WHERE run_id = ?
                """,
                (
                    "completed",
                    now,
                    now,
                    duration_ms,
                    "done",
                    100,
                    str(risk_level) if risk_level is not None else None,
                    json.dumps(metrics) if metrics is not None else None,
                    run_id,
                ),
            )

    def fail(self, run_id: str, *, error: str) -> None:
        now = time.time()
        with self._connect() as conn:
            row = conn.execute("SELECT created_at FROM runs WHERE run_id = ?", (run_id,)).fetchone()
            created = float(row["created_at"]) if row else now
            duration_ms = int(max(0.0, (now - created) * 1000))
            conn.execute(
                """
                UPDATE runs
                SET status = ?, updated_at = ?, completed_at = ?, duration_ms = ?,
                    stage = ?, progress = ?, error = ?
                WHERE run_id = ?
                """,
                ("failed", now, now, duration_ms, "error", 100, str(error), run_id),
            )

    def list_runs(self, limit: int = 50) -> list[dict[str, Any]]:
        limit = max(1, min(int(limit), 500))
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM runs ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [self._row_to_dict(r) for r in rows]

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,)).fetchone()
            return self._row_to_dict(row) if row else None

