from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DATA_DIR = PROJECT_ROOT / "backend" / "app" / "data"
DATA_DIR = BACKEND_DATA_DIR / "cache"
DATASET_DIR = BACKEND_DATA_DIR / "datasets"
UPLOAD_DIR = PROJECT_ROOT / "app" / "data" / "uploads"
CACHED_PREFIX = "cached_"
DATASETS = {
    "adult": "adult_cleaned.csv",
    "compas": "compas_cleaned.csv",
    "hmda": "hmda_cleaned.csv",
}
