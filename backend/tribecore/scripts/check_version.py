import subprocess
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent  # backend/tribecore

result = subprocess.run(
    [sys.executable, "-m", "setuptools_scm"],
    cwd=PACKAGE_ROOT,
    capture_output=True,
    text=True,
)

if result.returncode != 0:
    print(result.stdout)
    print(result.stderr, file=sys.stderr)
    raise RuntimeError("setuptools-scm failed to run. See output above.")

version = result.stdout.strip().splitlines()[-1]
print(f"Detected version: {version}")

if "dev" in version or version.startswith("0.0.0"):
    raise RuntimeError(
        f"Invalid package version detected: '{version}'. "
        "Git tag was not detected on this commit. "
        "Make sure the workflow checked out full history (fetch-depth: 0) "
        "and fetch-tags: true, and that a 'vX.Y.Z' tag exists on this commit."
    )