from pathlib import Path

DIST = Path(__file__).resolve().parent.parent / "dist"

files = sorted(DIST.glob("*"))

if not files:
    raise RuntimeError(f"No distribution files found in {DIST}")

print("Generated artifacts:")
for file in files:
    size_kb = file.stat().st_size / 1024
    print(f"- {file.name} ({size_kb:.1f} KB)")