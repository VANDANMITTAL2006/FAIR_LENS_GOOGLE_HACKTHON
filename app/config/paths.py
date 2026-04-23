from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
CACHED_PREFIX = "cached_"
DATASETS = {
    "adult": "adult_cleaned.csv",
    "compas": "compas_cleaned.csv",
    "hmda": "hmda_cleaned.csv",
}
