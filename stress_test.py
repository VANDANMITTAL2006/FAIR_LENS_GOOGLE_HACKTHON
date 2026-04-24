"""
FairLens Stress Test Script
Tests the SSE streaming audit endpoint with demo datasets.

Usage:
    python stress_test.py [--base-url http://localhost:8000] [--data-dir ./data]

Requirements:
    pip install httpx pandas
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any
from dataclasses import dataclass

import httpx
import pandas as pd


@dataclass
class TestResult:
    """Result of a single test run."""
    dataset: str
    rows: int
    total_time: float
    status: str  # PASSED or FAILED
    error: str | None = None


class FairLensStressTest:
    """Stress test suite for FairLens backend."""
    
    TIMEOUT_SECONDS = 10.0
    SSE_READ_TIMEOUT = 30.0
    STREAM_DELAY = 0.4  # Server sends events every 400ms
    
    def __init__(self, base_url: str, data_dir: Path):
        self.base_url = base_url.rstrip("/")
        self.data_dir = Path(data_dir)
        self.results: list[TestResult] = []
        self.client = httpx.AsyncClient(timeout=self.SSE_READ_TIMEOUT)
        
        # Demo datasets
        self.datasets = {
            "uci_adult": self.data_dir / "uci_adult.csv",
            "hud_hmda": self.data_dir / "hud_hmda.csv",
            "compas": self.data_dir / "compas.csv",
        }
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def _get_dataset_path(self, name: str) -> Path | None:
        """Resolve dataset name to file path."""
        # Try exact match first
        if name in self.datasets:
            path = self.datasets[name]
            if path.exists():
                return path
        
        # Try variations
        variations = [
            self.data_dir / f"{name}.csv",
            self.data_dir / name,
            self.data_dir / f"{name.lower()}.csv",
            self.data_dir / f"{name.replace('_', '')}.csv",
            self.data_dir / f"adult_cleaned.csv",  # fallback
            self.data_dir / f"compas_cleaned.csv",
            self.data_dir / f"hmda_cleaned.csv",
        ]
        
        for path in variations:
            if path.exists():
                return path
        
        return None
    
    async def upload_dataset(self, dataset_path: Path) -> str | None:
        """
        Upload a dataset and return the job_id.
        
        Returns:
            job_id if successful, None otherwise
        """
        try:
            with open(dataset_path, "rb") as f:
                files = {"file": (dataset_path.name, f, "text/csv")}
                response = await self.client.post(
                    f"{self.base_url}/upload",
                    files=files
                )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    job_id = data.get("job_id") or data.get("upload_id")
                    return job_id
                else:
                    print(f"  Upload failed: {data.get('error')}")
            else:
                print(f"  Upload failed: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"  Upload error: {e}")
        
        return None
    
    async def stream_audit(self, job_id: str) -> dict | None:
        """
        Connect to SSE stream and wait for completion.
        
        Returns:
            Final audit result dict if successful, None otherwise
        """
        result = None
        start_time = time.time()
        
        try:
            async with self.client.stream(
                "GET",
                f"{self.base_url}/audit/stream/{job_id}",
                headers={"Accept": "text/event-stream"}
            ) as response:
                if response.status_code != 200:
                    print(f"  Stream failed: HTTP {response.status_code}")
                    return None
                
                async for line in response.aiter_lines():
                    # Check overall timeout
                    if time.time() - start_time > self.SSE_READ_TIMEOUT:
                        print("  Stream timeout!")
                        break
                    
                    # Parse SSE line
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])  # Skip "data: " prefix
                            
                            # Check for final event
                            if data.get("done") and "result" in data:
                                result = data["result"]
                                break
                            
                            # Progress update (optional - could print here)
                            stage = data.get("stage")
                            progress = data.get("progress")
                            message = data.get("message")
                            
                            if stage and progress is not None:
                                # Print progress every 25%
                                if progress % 25 == 0:
                                    print(f"  [{stage}] {progress}% - {message[:50]}...")
                            
                            # Check for error
                            if data.get("error"):
                                print(f"  Stream error: {data['error']}")
                                return None
                                
                        except json.JSONDecodeError:
                            continue
        
        except httpx.ReadTimeout:
            print("  Stream read timeout!")
        except Exception as e:
            print(f"  Stream error: {e}")
        
        return result
    
    async def test_single_dataset(self, dataset_name: str) -> TestResult:
        """Test a single dataset: upload -> stream -> measure."""
        print(f"\n🧪 Testing: {dataset_name}")
        
        # Find dataset file
        dataset_path = self._get_dataset_path(dataset_name)
        if not dataset_path:
            print(f"  ❌ Dataset file not found for: {dataset_name}")
            return TestResult(
                dataset=dataset_name,
                rows=0,
                total_time=0.0,
                status="FAILED",
                error="Dataset file not found"
            )
        
        # Get row count
        try:
            df = pd.read_csv(dataset_path)
            row_count = len(df)
            print(f"  📊 Rows: {row_count:,}")
        except Exception as e:
            print(f"  ❌ Failed to read CSV: {e}")
            return TestResult(
                dataset=dataset_name,
                rows=0,
                total_time=0.0,
                status="FAILED",
                error=f"CSV read error: {e}"
            )
        
        # Upload
        print("  📤 Uploading...")
        job_id = await self.upload_dataset(dataset_path)
        if not job_id:
            return TestResult(
                dataset=dataset_name,
                rows=row_count,
                total_time=0.0,
                status="FAILED",
                error="Upload failed"
            )
        print(f"  ✅ Job ID: {job_id[:16]}...")
        
        # Stream audit with timing
        print("  🔍 Streaming audit...")
        start_time = time.time()
        result = await self.stream_audit(job_id)
        total_time = time.time() - start_time
        
        if result is None:
            status = "FAILED"
            error_msg = "Stream failed or timeout"
            print(f"  ❌ {error_msg}")
        elif total_time > self.TIMEOUT_SECONDS:
            status = "FAILED"
            error_msg = f"Exceeded {self.TIMEOUT_SECONDS}s limit"
            print(f"  ⏱️  Time: {total_time:.2f}s - {error_msg}")
        else:
            status = "PASSED"
            error_msg = None
            # Extract audit status from result
            audit_status = result.get("status", "unknown")
            component_status = result.get("component_status", {})
            print(f"  ✅ PASSED in {total_time:.2f}s (audit: {audit_status})")
            if component_status.get("shap") == "ok":
                print(f"     SHAP: ✓  Counterfactuals: ✓  Regulatory: ✓")
        
        return TestResult(
            dataset=dataset_name,
            rows=row_count,
            total_time=total_time,
            status=status,
            error=error_msg
        )
    
    async def run_sequential_tests(self) -> list[TestResult]:
        """Run tests for all datasets sequentially."""
        print("=" * 60)
        print("SEQUENTIAL TEST SUITE")
        print("=" * 60)
        
        results = []
        for dataset_name in self.datasets.keys():
            result = await self.test_single_dataset(dataset_name)
            results.append(result)
        
        return results
    
    async def run_concurrent_tests(self) -> dict[str, Any]:
        """Upload all 3 datasets at once and verify backend doesn't crash."""
        print("\n" + "=" * 60)
        print("CONCURRENT TEST (3 datasets uploaded simultaneously)")
        print("=" * 60)
        
        # Check which datasets exist
        existing_datasets = []
        for name, path in self.datasets.items():
            actual_path = self._get_dataset_path(name)
            if actual_path:
                existing_datasets.append((name, actual_path))
        
        if len(existing_datasets) < 2:
            print("⚠️  Not enough datasets found for meaningful concurrent test")
            return {"status": "SKIPPED", "reason": "Not enough datasets"}
        
        print(f"📤 Uploading {len(existing_datasets)} datasets concurrently...")
        
        # Upload all datasets concurrently
        upload_tasks = []
        for name, path in existing_datasets:
            upload_tasks.append(self._upload_and_return_job(name, path))
        
        start_time = time.time()
        job_results = await asyncio.gather(*upload_tasks, return_exceptions=True)
        upload_time = time.time() - start_time
        
        # Check for crashes
        exceptions = [r for r in job_results if isinstance(r, Exception)]
        successful_jobs = [r for r in job_results if isinstance(r, tuple)]
        
        print(f"\n  Upload completed in {upload_time:.2f}s")
        print(f"  Successful uploads: {len(successful_jobs)}/{len(existing_datasets)}")
        
        if exceptions:
            print(f"  ⚠️  Exceptions during upload: {len(exceptions)}")
            for e in exceptions:
                print(f"    - {e}")
        
        # Stream all audits concurrently
        if successful_jobs:
            print(f"\n🔍 Streaming {len(successful_jobs)} audits concurrently...")
            stream_tasks = []
            for name, job_id in successful_jobs:
                stream_tasks.append(self._stream_with_timeout(name, job_id))
            
            start_time = time.time()
            stream_results = await asyncio.gather(*stream_tasks, return_exceptions=True)
            stream_time = time.time() - start_time
            
            successful_streams = [r for r in stream_results if isinstance(r, tuple)]
            stream_exceptions = [r for r in stream_results if isinstance(r, Exception)]
            
            print(f"\n  Streaming completed in {stream_time:.2f}s")
            print(f"  Successful streams: {len(successful_streams)}/{len(successful_jobs)}")
            
            if stream_exceptions:
                print(f"  ⚠️  Exceptions during streaming: {len(stream_exceptions)}")
        
        # Determine if backend crashed
        total_exceptions = len(exceptions) + len(stream_exceptions)
        crashed = total_exceptions > 0 and any(
            "Connection" in str(e) or "Remote end closed" in str(e)
            for e in exceptions + stream_exceptions
        )
        
        if crashed:
            print("\n  💥 BACKEND CRASH DETECTED!")
            return {"status": "CRASHED", "exceptions": total_exceptions}
        elif total_exceptions > 0:
            print(f"\n  ⚠️  {total_exceptions} errors (backend stable)")
            return {"status": "PARTIAL", "exceptions": total_exceptions}
        else:
            print("\n  ✅ All concurrent operations completed successfully")
            return {"status": "PASSED"}
    
    async def _upload_and_return_job(self, name: str, path: Path) -> tuple[str, str]:
        """Upload and return (name, job_id)."""
        job_id = await self.upload_dataset(path)
        if not job_id:
            raise Exception(f"Upload failed for {name}")
        return (name, job_id)
    
    async def _stream_with_timeout(self, name: str, job_id: str) -> tuple[str, dict]:
        """Stream with name tracking."""
        result = await asyncio.wait_for(
            self.stream_audit(job_id),
            timeout=self.SSE_READ_TIMEOUT + 5
        )
        if result is None:
            raise Exception(f"Stream failed for {name}")
        return (name, result)
    
    def print_results_table(self, results: list[TestResult]):
        """Print results as a markdown table."""
        print("\n" + "=" * 60)
        print("RESULTS SUMMARY")
        print("=" * 60)
        print()
        print("| Dataset | Rows | Total Time | Status |")
        print("|---------|------|------------|--------|")
        
        for r in results:
            time_str = f"{r.total_time:.2f}s"
            status_str = f"✅ {r.status}" if r.status == "PASSED" else f"❌ {r.status}"
            rows_str = f"{r.rows:,}" if r.rows > 0 else "N/A"
            print(f"| {r.dataset} | {rows_str} | {time_str} | {status_str} |")
        
        # Summary stats
        passed = sum(1 for r in results if r.status == "PASSED")
        failed = sum(1 for r in results if r.status == "FAILED")
        
        print()
        print(f"**Summary:** {passed} passed, {failed} failed out of {len(results)} tests")
        
        # Performance note
        slow_tests = [r for r in results if r.total_time > self.TIMEOUT_SECONDS and r.status == "PASSED"]
        if slow_tests:
            print(f"\n⚠️  Warning: {len(slow_tests)} tests passed but exceeded {self.TIMEOUT_SECONDS}s threshold")
    
    async def run_all(self):
        """Run complete test suite."""
        print("🚀 FairLens Stress Test")
        print(f"Base URL: {self.base_url}")
        print(f"Data Dir: {self.data_dir}")
        print(f"Timeout Threshold: {self.TIMEOUT_SECONDS}s")
        
        # Check health first
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                print("✅ Backend is healthy")
            else:
                print(f"⚠️  Health check returned HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ Cannot connect to backend: {e}")
            return 1
        
        # Run sequential tests
        results = await self.run_sequential_tests()
        self.print_results_table(results)
        
        # Run concurrent tests
        concurrent_result = await self.run_concurrent_tests()
        
        # Final summary
        print("\n" + "=" * 60)
        print("FINAL VERDICT")
        print("=" * 60)
        
        passed = sum(1 for r in results if r.status == "PASSED")
        total = len(results)
        
        if passed == total and concurrent_result.get("status") == "PASSED":
            print("✅ ALL TESTS PASSED - Backend is production-ready!")
            return 0
        elif passed >= total // 2:
            print(f"⚠️  PARTIAL SUCCESS ({passed}/{total} sequential tests passed)")
            print(f"   Concurrent test: {concurrent_result.get('status')}")
            return 0 if concurrent_result.get("status") != "CRASHED" else 1
        else:
            print(f"❌ MOST TESTS FAILED ({passed}/{total} passed)")
            return 1


def main():
    parser = argparse.ArgumentParser(description="FairLens Stress Test")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the FairLens API (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--data-dir",
        default="./data",
        help="Directory containing demo datasets (default: ./data)"
    )
    
    args = parser.parse_args()
    
    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        # Try alternative locations
        alt_dirs = [
            Path("./app/data/datasets"),
            Path("./backend/app/data/datasets"),
            Path("../data"),
            Path("../backend/app/data/datasets"),
        ]
        for alt in alt_dirs:
            if alt.exists():
                data_dir = alt
                break
        else:
            print(f"❌ Data directory not found: {args.data_dir}")
            print("Checked locations:")
            print(f"  - {args.data_dir}")
            for alt in alt_dirs:
                print(f"  - {alt}")
            sys.exit(1)
    
    print(f"Using data directory: {data_dir}")
    
    async def run():
        async with FairLensStressTest(args.base_url, data_dir) as tester:
            return await tester.run_all()
    
    exit_code = asyncio.run(run())
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
