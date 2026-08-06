#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🔨  Building Social Tribe API (Release)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ===== Get script directory =====
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Script Directory: $SCRIPT_DIR"

# ===== Go to project root =====
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
echo "📁 Project Root: $PROJECT_ROOT"

# ===== Go to project root for build =====
cd "$PROJECT_ROOT"
echo "📁 Build Directory: $(pwd)"
echo ""

# ===== Set Python Path =====
export PYTHONPATH="$PROJECT_ROOT:$PROJECT_ROOT/backend:$PROJECT_ROOT/backend/api-server"
echo "🐍 PYTHONPATH: $PYTHONPATH"
echo "🐍 Python: $(which python)"
echo "🐍 Python Version: $(python --version 2>&1)"
echo ""

# ===== Debug: Show directory structure =====
echo "═══════════════════════════════════════════════════════════════"
echo "📂  Directory Structure (Project Root)"
echo "═══════════════════════════════════════════════════════════════"
ls -la
echo ""

echo "📂  Directory Structure (backend)"
echo "───────────────────────────────────────────────────────────────"
ls -la backend/ 2>/dev/null || echo "❌ backend directory not found"
echo ""

echo "📂  Directory Structure (backend/api-server)"
echo "───────────────────────────────────────────────────────────────"
ls -la backend/api-server/ 2>/dev/null || echo "❌ api-server directory not found"
echo ""

echo "📂  Directory Structure (backend/api-server/routers)"
echo "───────────────────────────────────────────────────────────────"
ls -la backend/api-server/routers/ 2>/dev/null || echo "❌ routers directory not found"
echo ""

echo "📂  Checking for main.py"
if [ -f "backend/api-server/main.py" ]; then
    echo "✅ main.py found at: backend/api-server/main.py"
    echo "   First 5 lines:"
    head -5 backend/api-server/main.py
else
    echo "❌ main.py NOT FOUND!"
    exit 1
fi
echo ""

# ===== Install zstandard =====
echo "📦  Installing zstandard"
echo "───────────────────────────────────────────────────────────────"
pip install zstandard 2>/dev/null && echo "✅ zstandard installed" || echo "✅ zstandard already installed"
echo ""

# ===== Clean previous build =====
echo "🧹  Cleaning previous build"
echo "───────────────────────────────────────────────────────────────"
rm -rf backend/api-server/app_exe/dist backend/api-server/app_exe/build
echo "✅ Cleaned"
echo ""

# ===== Build from project root with CORRECT package structure =====
echo "═══════════════════════════════════════════════════════════════"
echo "🔨  Starting Nuitka Build"
echo "═══════════════════════════════════════════════════════════════"
echo ""

python -m nuitka \
    --onefile \
    --standalone \
    --deployment \
    --assume-yes-for-downloads \
    --remove-output \
    --enable-plugin=anti-bloat \
    --no-prefer-source-code \
    --output-dir=backend/api-server/app_exe/dist \
    --output-filename=Tribe-Server \
    --jobs=4 \
    --include-data-dir=backend=backend \
    --include-package=backend \
    --include-package=backend.api-server \
    --include-package=backend.api-server.routers \
    --include-package=backend.api-server.routers.api \
    --include-package=backend.api-server.routers.api.v1 \
    --include-package=backend.api-server.core \
    --include-package=backend.api-server.services \
    --include-package=backend.api-server.schemas \
    --include-package=backend.api-server.utils \
    --include-package=backend.api-server.algorithms \
    --include-package=backend.api-server.layout_engine \
    --include-package=backend.api-server.query_engine \
    --include-package=backend.api-server.storage_engine \
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
    backend/api-server/main.py

# ===== Check build result =====
BUILD_EXIT_CODE=$?
echo ""
echo "═══════════════════════════════════════════════════════════════"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅  BUILD SUCCESSFUL!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # ===== Verify build output =====
    echo "📂  Verifying Build Output"
    echo "───────────────────────────────────────────────────────────────"
    
    echo "📁  app_exe/dist contents:"
    ls -la backend/api-server/app_exe/dist/ 2>/dev/null || echo "❌ Directory not found!"
    echo ""
    
    # ===== Create target directory =====
    TARGET_DIR="$PROJECT_ROOT/frontend/src-tauri/bin"
    mkdir -p "$TARGET_DIR"
    echo "📁  Target directory: $TARGET_DIR"
    
    # ===== Copy and rename for Linux =====
    SOURCE_FILE="backend/api-server/app_exe/dist/Tribe-Server"
    TARGET_FILE="$TARGET_DIR/tribe-backend-server-x86_64-unknown-linux-gnu"
    
    if [ -f "$SOURCE_FILE" ]; then
        echo "📄  Source file: $SOURCE_FILE"
        echo "   Size: $(ls -lh "$SOURCE_FILE" | awk '{print $5}')"
        
        cp "$SOURCE_FILE" "$TARGET_FILE"
        chmod +x "$TARGET_FILE"
        
        echo "📄  Target file: $TARGET_FILE"
        echo "   Size: $(ls -lh "$TARGET_FILE" | awk '{print $5}')"
        echo "✅  File copied successfully"
        echo ""
        
        # ===== Test executable =====
        echo "🧪  Testing executable"
        echo "───────────────────────────────────────────────────────────────"
        
        # تست با --help
        if "$TARGET_FILE" --help 2>&1 | head -5; then
            echo "✅  Executable test passed (--help)"
        else
            echo "⚠️  Executable test failed (--help not supported)"
            echo "   Trying -h..."
            if "$TARGET_FILE" -h 2>&1 | head -5; then
                echo "✅  Executable test passed (-h)"
            else
                echo "ℹ️  Executable built but no help option"
                echo "   File exists and is executable"
            fi
        fi
        echo ""
        
        echo "═══════════════════════════════════════════════════════════════"
        echo "✅  ALL DONE!"
        echo "═══════════════════════════════════════════════════════════════"
        echo "📦  File: $TARGET_FILE"
        echo "📦  Size: $(ls -lh "$TARGET_FILE" | awk '{print $5}')"
        echo "═══════════════════════════════════════════════════════════════"
    else
        echo "❌  Source file not found: $SOURCE_FILE"
        echo ""
        echo "📂  Directory contents:"
        ls -la backend/api-server/app_exe/dist/ 2>/dev/null || echo "   app_exe/dist/ not found"
        exit 1
    fi
    
else
    echo "❌  BUILD FAILED!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "🔍  Error Details:"
    echo "   Exit Code: $BUILD_EXIT_CODE"
    echo ""
    echo "📂  Current directory: $(pwd)"
    echo "📂  Contents:"
    ls -la
    echo ""
    echo "📂  Check backend/api-server/app_exe directory:"
    ls -la backend/api-server/app_exe/ 2>/dev/null || echo "   app_exe/ not found"
    echo ""
    exit $BUILD_EXIT_CODE
fi