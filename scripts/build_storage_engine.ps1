# build_storage_engine.ps1
# Build script for TribeDB - Social Graph Database Server
# Author: Alireza Askari
# Company: Social Tribe

param(
    [switch]$Release,
    [switch]$NoResources,
    [string]$OutputDir = ".",
    [string]$Arch = "amd64",
    [string]$Os = "windows"
)

# Error handling
$ErrorActionPreference = "Stop"

# Color functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    $colors = @{
        Green = 92
        Yellow = 93
        Blue = 94
        Red = 91
        White = 97
        Cyan = 96
        Magenta = 95
    }
    if ($colors.ContainsKey($Color)) {
        Write-Host -NoNewline "`e[$($colors[$Color])m"
        Write-Host $Message
        Write-Host -NoNewline "`e[0m"
    } else {
        Write-Host $Message
    }
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-ColorOutput "Script directory: $ScriptDir" "Cyan"

# Go to project root (backend/graph-storage)
$ProjectRoot = Join-Path $ScriptDir "..\backend\graph-storage"
$ProjectRoot = Resolve-Path $ProjectRoot

if (-not (Test-Path $ProjectRoot)) {
    Write-ColorOutput "[ERROR] Cannot find project root at: $ProjectRoot" "Red"
    exit 1
}

Set-Location $ProjectRoot
Write-ColorOutput "Project root: $ProjectRoot" "Green"

# Configuration
$AppName = "TribeDB"
$BinaryName = if ($Os -eq "windows") { "$AppName.exe" } else { $AppName }
$WinResDir = Join-Path $ProjectRoot "winres"
$IconPath = Join-Path $WinResDir "tribedb-icon.png"
$WinResJson = Join-Path $WinResDir "winres.json"

# Validate Windows-specific files
if ($Os -eq "windows") {
    if (-not (Test-Path $IconPath)) {
        Write-ColorOutput "[WARNING] Icon file not found at: $IconPath" "Yellow"
        Write-ColorOutput "Will use default icon if available" "Yellow"
    }
    
    if (-not (Test-Path $WinResJson)) {
        Write-ColorOutput "[ERROR] winres.json not found at: $WinResJson" "Red"
        exit 1
    }
}

# Get version from git
try {
    $Version = git describe --tags --always --dirty 2>$null
    if (-not $Version) { $Version = "v1.0.0" }
    $Version = $Version -replace '^v', ''
} catch {
    $Version = "1.0.0"
}

# Get commit hash
try {
    $Commit = git rev-parse --short HEAD 2>$null
    if (-not $Commit) { $Commit = "unknown" }
} catch {
    $Commit = "unknown"
}

# Get build time
$BuildTime = Get-Date -Format "yyyy-MM-dd_HH:mm:ss"
$BuildTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Set build mode
$BuildMode = if ($Release) { "release" } else { "debug" }
$IsRelease = if ($Release) { "true" } else { "false" }

# Set ldflags
$LdFlags = @(
    "-s -w",
    "-X 'main.Version=$Version'",
    "-X 'main.Commit=$Commit'",
    "-X 'main.BuildTime=$BuildTime'",
    "-X 'main.BuildMode=$BuildMode'",
    "-X 'main.IsRelease=$IsRelease'"
)
$LdFlagsStr = $LdFlags -join " "

# Print banner
Write-ColorOutput "============================================" "Blue"
Write-ColorOutput "  $AppName - Social Graph Database Server" "Green"
Write-ColorOutput "============================================" "Blue"
Write-ColorOutput "  Version    : $Version" "Yellow"
Write-ColorOutput "  Commit     : $Commit" "Yellow"
Write-ColorOutput "  Build Time : $BuildTime" "Yellow"
Write-ColorOutput "  Build Mode : $BuildMode" "Yellow"
Write-ColorOutput "  OS         : $Os" "Yellow"
Write-ColorOutput "  Arch       : $Arch" "Yellow"
Write-ColorOutput "  Author     : Alireza Askari" "Yellow"
Write-ColorOutput "  Company    : Social Tribe" "Yellow"
Write-ColorOutput "  Project    : $ProjectRoot" "Cyan"
if ($Os -eq "windows") {
    Write-ColorOutput "  Icon Path  : $IconPath" "Yellow"
}
Write-ColorOutput "============================================" "Blue"
Write-Host ""

# Step 1: Generate Windows resources (only for Windows)
if ($Os -eq "windows" -and -not $NoResources) {
    Write-ColorOutput "[1/3] Generating Windows resources..." "Yellow"
    try {
        # Check if go-winres is installed
        $winresInstalled = Get-Command go-winres -ErrorAction SilentlyContinue
        if (-not $winresInstalled) {
            Write-ColorOutput "go-winres not found, installing..." "Yellow"
            go install github.com/tc-hib/go-winres@latest
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to install go-winres"
            }
        }
        
        # Change to winres directory for generation
        Push-Location $WinResDir
        
        # Generate resources with explicit icon path
        Write-ColorOutput "Generating resources from: $WinResDir" "Cyan"
        if (Test-Path "tribedb-icon.png") {
            Write-ColorOutput "Using icon: tribedb-icon.png" "Cyan"
            go-winres make -in winres.json -icon tribedb-icon.png
        } else {
            Write-ColorOutput "No icon found, generating without icon" "Yellow"
            go-winres make -in winres.json
        }
        $winresResult = $LASTEXITCODE
        
        Pop-Location
        
        if ($winresResult -ne 0) {
            throw "Failed to generate Windows resources (exit code: $winresResult)"
        }
        
        Write-ColorOutput "Windows resources generated successfully!" "Green"
    } catch {
        Write-ColorOutput "[ERROR] Failed to generate Windows resources: $_" "Red"
        exit 1
    }
} else {
    if ($Os -eq "windows") {
        Write-ColorOutput "[1/3] Skipping Windows resources generation" "Yellow"
    } else {
        Write-ColorOutput "[1/3] Skipping Windows resources (not a Windows build)" "Yellow"
    }
}

# Step 2: Clean previous builds
Write-ColorOutput "[2/3] Cleaning previous builds..." "Yellow"
$BinaryPath = Join-Path $ProjectRoot $BinaryName
if (Test-Path $BinaryPath) {
    Remove-Item $BinaryPath -Force
    Write-ColorOutput "Removed existing binary" "Green"
}
# Clean any old resource files (Windows only)
if ($Os -eq "windows") {
    Get-ChildItem -Path $ProjectRoot -Filter "*.syso" | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-ColorOutput "Removed: $($_.Name)" "Green"
    }
}

# Step 3: Build
Write-ColorOutput "[3/3] Compiling $AppName for $Os/$Arch..." "Yellow"

$BuildArgs = @(
    "build",
    "-ldflags=`"$LdFlagsStr`"",
    "-trimpath",
    "-o", $BinaryName
)

if ($Release) {
    $BuildArgs += "-tags=release"
}

# Set GOOS and GOARCH
$env:GOOS = $Os
$env:GOARCH = $Arch

Write-ColorOutput "Running: go $($BuildArgs -join ' ')" "Cyan"
Write-ColorOutput "Working directory: $ProjectRoot" "Cyan"
$buildResult = go $BuildArgs 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "[ERROR] Build failed!" "Red"
    Write-ColorOutput $buildResult "Red"
    exit 1
}

Write-ColorOutput "Build completed successfully!" "Green"

# Show results
Write-Host ""
Write-ColorOutput "============================================" "Blue"
Write-ColorOutput "  BUILD DETAILS" "Blue"
Write-ColorOutput "============================================" "Blue"

# Get file size and verify icon embedded
$BinaryPath = Join-Path $ProjectRoot $BinaryName
if (Test-Path $BinaryPath) {
    $FileInfo = Get-Item $BinaryPath
    $FileSize = $FileInfo.Length
    $FileSizeMB = [math]::Round($FileSize / 1MB, 2)
    $FileSizeKB = [math]::Round($FileSize / 1KB, 2)
    
    Write-ColorOutput "  Binary     : $BinaryName" "Green"
    Write-ColorOutput "  Location   : $($FileInfo.FullName)" "White"
    Write-ColorOutput "  Size       : $FileSizeMB MB ($FileSizeKB KB)" "Yellow"
    Write-ColorOutput "  Version    : $Version" "Yellow"
    Write-ColorOutput "  Commit     : $Commit" "Yellow"
    Write-ColorOutput "  Build Time : $BuildTime" "Yellow"
    Write-ColorOutput "  Build Mode : $BuildMode" "Yellow"
    Write-ColorOutput "  OS/Arch    : $Os/$Arch" "Yellow"
    
    if ($Os -eq "windows") {
        Write-ColorOutput "  Icon       : Embedded from tribedb-icon.png" "Green"
    }
} else {
    Write-ColorOutput "  [WARNING] Binary not found at: $BinaryPath" "Red"
}

Write-ColorOutput "============================================" "Blue"
Write-Host ""
Write-ColorOutput "[READY] Run $BinaryName to start." "Green"
Write-Host ""

# Return build info for scripts
return @{
    Version = $Version
    Commit = $Commit
    BuildTime = $BuildTime
    BinaryPath = $BinaryPath
    FileSize = $FileSize
    OS = $Os
    Arch = $Arch
}