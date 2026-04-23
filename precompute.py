import json
from pathlib import Path

import pandas as pd

from app.config.paths import CACHED_PREFIX, DATASETS, DATA_DIR
from app.modules.audit_engine import audit


def main():
    for dataset_name, filename in DATASETS.items():
        csv_path = Path(DATA_DIR) / filename
        cache_path = Path(DATA_DIR) / f"{CACHED_PREFIX}{dataset_name}.json"

        df = pd.read_csv(csv_path)
        result = audit(df)

        with cache_path.open("w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2)

        print(f"Cached: {dataset_name}")


if __name__ == "__main__":
    main()