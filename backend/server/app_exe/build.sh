#!/bin/bash

echo "========================================"
echo "Building Social Tribe API (Release)"
echo "========================================"

# ===== Detect Paths Dynamically =====
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Project Root: $PROJECT_ROOT"
echo "Script Dir:   $SCRIPT_DIR"
echo ""

# ===== Clean all caches first =====
echo "🧹 Cleaning all caches..."
rm -rf "$SCRIPT_DIR/dist/"
rm -rf "$SCRIPT_DIR/build/"
find "$PROJECT_ROOT" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find "$PROJECT_ROOT" -type f -name "*.pyc" -delete
python3 -m nuitka --clean-cache=all 2>/dev/null || true
echo "✅ Caches cleaned"
echo ""

# ===== Change Working Directory =====
cd "$SCRIPT_DIR" || exit 1

# ===== Python Path =====
export PYTHONPATH="$PROJECT_ROOT"

# ===== Build =====
python -m nuitka \
    --onefile \
    --standalone \
    --deployment \
    --assume-yes-for-downloads \
    --remove-output \
    --enable-plugin=anti-bloat \
    --no-prefer-source-code \
    --include-package=server \
    --output-dir=dist \
    --output-filename=Tribe-Server \
    --jobs=4 \
    --nofollow-import-to=pytest \
    --nofollow-import-to=unittest \
    --nofollow-import-to=setuptools \
    --nofollow-import-to=tkinter \
    --nofollow-import-to=IPython \
    --nofollow-import-to=jupyter \
    --nofollow-import-to=notebook \
    --nofollow-import-to=sympy \
    --nofollow-import-to=scipy.tests \
    --nofollow-import-to=matplotlib.tests \
    "$PROJECT_ROOT/server/main.py"

# ===== Check result =====
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "✅ Build successful!"
    echo "========================================"
    echo ""
    echo "Executable:"
    echo "  $SCRIPT_DIR/dist/Tribe-Server"
    ls -la "$SCRIPT_DIR/dist/Tribe-Server"
    echo ""
else
    echo ""
    echo "========================================"
    echo "❌ Build failed!"
    echo "Error Code: $?"
    echo "========================================"
    exit 1
fi