from importlib import import_module
from pathlib import Path

required_files = [
    "main.py",
    "precompute.py",
    "Procfile",
    "requirements.txt",
    "app/main.py",
    "app/config/paths.py",
    "app/core/settings.py",
    "app/routers/audit.py",
    "app/routers/upload.py",
    "app/services/audit_service.py",
    "app/services/attribute_detector.py",
    "app/modules/stream_steps.py",
    "app/utils/responses.py",
]

required_imports = [
    "main",
    "precompute",
    "app.main",
    "app.config.paths",
    "app.core.settings",
    "app.routers.audit",
    "app.routers.upload",
    "app.services.audit_service",
    "app.services.attribute_detector",
    "app.modules.stream_steps",
    "app.utils.responses",
]


def run_checks() -> int:
    failures = 0

    for path in required_files:
        if Path(path).exists():
            print(f"PASS file: {path}")
        else:
            print(f"FAIL file: {path}")
            failures += 1

    for module_name in required_imports:
        try:
            import_module(module_name)
            print(f"PASS import: {module_name}")
        except Exception as exc:
            print(f"FAIL import: {module_name} ({exc})")
            failures += 1

    if failures == 0:
        print("PASS structure")
    else:
        print("FAIL structure")

    return failures


if __name__ == "__main__":
    raise SystemExit(1 if run_checks() else 0)