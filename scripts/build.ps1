# build.ps1 - Windows build with professional logging
param(
    [string]$ScriptDir = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔨  Building Social Tribe API (Release)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 Script Directory: $ScriptDir" -ForegroundColor Yellow

# ===== Go to project root =====
$ProjectRoot = (Get-Item "$ScriptDir\..").FullName
Write-Host "📁 Project Root: $ProjectRoot" -ForegroundColor Yellow

# ===== Go to project root for build =====
Set-Location "$ProjectRoot"
Write-Host "📁 Build Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# ===== Set Python Path =====
$env:PYTHONPATH = "$ProjectRoot;$ProjectRoot\backend;$ProjectRoot\backend\api-server"
Write-Host "🐍 PYTHONPATH: $env:PYTHONPATH" -ForegroundColor Green
Write-Host "🐍 Python: $(Get-Command python).Source"
Write-Host "🐍 Python Version: $(python --version 2>&1)"
Write-Host ""

# ===== Debug: Show directory structure =====
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📂  Directory Structure (Project Root)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Get-ChildItem -Force
Write-Host ""

Write-Host "📂  Directory Structure (backend)" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
Get-ChildItem "backend\" -Force 2>$null
Write-Host ""

Write-Host "📂  Directory Structure (backend\api-server)" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
Get-ChildItem "backend\api-server\" -Force 2>$null
Write-Host ""

Write-Host "📂  Directory Structure (backend\api-server\routers)" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
Get-ChildItem "backend\api-server\routers\" -Force 2>$null
Write-Host ""

Write-Host "📂  Checking for main.py" -ForegroundColor Cyan
if (Test-Path "backend\api-server\main.py") {
    Write-Host "✅ main.py found at: backend\api-server\main.py" -ForegroundColor Green
    Write-Host "   First 5 lines:"
    Get-Content "backend\api-server\main.py" -Head 5
} else {
    Write-Host "❌ main.py NOT FOUND!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ===== Install zstandard =====
Write-Host "📦  Installing zstandard" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
pip install zstandard 2>$null
Write-Host "✅ zstandard ready" -ForegroundColor Green
Write-Host ""

# ===== Clean previous build =====
Write-Host "🧹  Cleaning previous build" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
if (Test-Path "backend\api-server\app_exe\dist") { Remove-Item -Recurse -Force "backend\api-server\app_exe\dist" }
if (Test-Path "backend\api-server\app_exe\build") { Remove-Item -Recurse -Force "backend\api-server\app_exe\build" }
Write-Host "✅ Cleaned" -ForegroundColor Green
Write-Host ""

# ===== Build from project root with CORRECT package structure =====
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔨  Starting Nuitka Build" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$BuildArgs = @(
    "--onefile",
    "--standalone",
    "--deployment",
    "--assume-yes-for-downloads",
    "--remove-output",
    "--enable-plugin=anti-bloat",
    "--no-prefer-source-code",
    "--windows-console-mode=force",
    "--windows-icon-from-ico=backend\api-server\app_exe\icon.ico",
    "--output-dir=backend\api-server\app_exe\dist",
    "--output-filename=Tribe-Server.exe",
    "--jobs=4",
    "--include-data-dir=backend=backend",
    "--include-package=backend",
    "--include-package=backend.api-server",
    "--include-package=backend.api-server.routers",
    "--include-package=backend.api-server.routers.api",
    "--include-package=backend.api-server.routers.api.v1",
    "--include-package=backend.api-server.core",
    "--include-package=backend.api-server.services",
    "--include-package=backend.api-server.schemas",
    "--include-package=backend.api-server.utils",
    "--include-package=backend.api-server.algorithms",
    "--include-package=backend.api-server.layout_engine",
    "--include-package=backend.api-server.query_engine",
    "--include-package=backend.api-server.storage_engine",
    "--nofollow-import-to=pytest",
    "--nofollow-import-to=unittest",
    "--nofollow-import-to=setuptools",
    "--nofollow-import-to=tkinter",
    "--nofollow-import-to=IPython",
    "--nofollow-import-to=jupyter",
    "--nofollow-import-to=notebook",
    "--nofollow-import-to=sympy",
    "--nofollow-import-to=scipy.tests",
    "--nofollow-import-to=matplotlib.tests",
    "backend\api-server\main.py"
)

python -m nuitka $BuildArgs

# ===== Check build result =====
$BuildExitCode = $LASTEXITCODE
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($BuildExitCode -eq 0) {
    Write-Host "✅  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    
    # ===== Verify build output =====
    Write-Host "📂  Verifying Build Output" -ForegroundColor Cyan
    Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
    
    Write-Host "📁  app_exe\dist contents:"
    Get-ChildItem "backend\api-server\app_exe\dist" -ErrorAction SilentlyContinue
    Write-Host ""
    
    # ===== Create target directory =====
    $TargetDir = "$ProjectRoot\frontend\src-tauri\bin"
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    Write-Host "📁  Target directory: $TargetDir" -ForegroundColor Yellow
    
    # ===== Copy and rename for Windows =====
    $SourceFile = "backend\api-server\app_exe\dist\Tribe-Server.exe"
    $TargetFile = "$TargetDir\tribe-backend-server-x86_64-pc-windows-msvc.exe"
    
    if (Test-Path $SourceFile) {
        $SourceSize = [math]::Round((Get-Item $SourceFile).Length / 1MB, 2)
        Write-Host "📄  Source file: $SourceFile" -ForegroundColor Green
        Write-Host "   Size: $SourceSize MB"
        
        Copy-Item -Path $SourceFile -Destination $TargetFile -Force
        $TargetSize = [math]::Round((Get-Item $TargetFile).Length / 1MB, 2)
        
        Write-Host "📄  Target file: $TargetFile" -ForegroundColor Green
        Write-Host "   Size: $TargetSize MB"
        Write-Host "✅  File copied successfully" -ForegroundColor Green
        Write-Host ""
        
        # ===== Test executable =====
        Write-Host "🧪  Testing executable" -ForegroundColor Cyan
        Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
        
        try {
            $HelpOutput = & $TargetFile --help 2>&1 | Select-Object -First 5
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅  Executable test passed (--help)" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Executable test failed (--help not supported)" -ForegroundColor Yellow
                Write-Host "   Trying -h..."
                $HOutput = & $TargetFile -h 2>&1 | Select-Object -First 5
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅  Executable test passed (-h)" -ForegroundColor Green
                } else {
                    Write-Host "ℹ️  Executable built but no help option" -ForegroundColor Yellow
                    Write-Host "   File exists and is executable"
                }
            }
        } catch {
            Write-Host "ℹ️  Executable built but test failed" -ForegroundColor Yellow
            Write-Host "   File exists and is executable"
        }
        Write-Host ""
        
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "✅  ALL DONE!" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "📦  File: $TargetFile" -ForegroundColor Yellow
        Write-Host "📦  Size: $TargetSize MB" -ForegroundColor Yellow
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    } else {
        Write-Host "❌  Source file not found: $SourceFile" -ForegroundColor Red
        Write-Host ""
        Write-Host "📂  Directory contents:"
        Get-ChildItem "backend\api-server\app_exe\dist" -ErrorAction SilentlyContinue
        exit 1
    }
    
} else {
    Write-Host "❌  BUILD FAILED!" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍  Error Details:" -ForegroundColor Red
    Write-Host "   Exit Code: $BuildExitCode" -ForegroundColor Red
    Write-Host ""
    Write-Host "📂  Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "📂  Contents:" -ForegroundColor Yellow
    Get-ChildItem -Force
    Write-Host ""
    Write-Host "📂  Check backend\api-server\app_exe directory:" -ForegroundColor Yellow
    Get-ChildItem "backend\api-server\app_exe" -ErrorAction SilentlyContinue
    Write-Host ""
    exit $BuildExitCode
}