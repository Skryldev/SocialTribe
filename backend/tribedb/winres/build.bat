@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================
:: TribeDB - Social Graph Database Server
:: Professional Build Script for Windows
:: Author: Alireza Askari - Social Tribe
:: ============================================

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Go to project root
if exist "winres\winres.json" (
    echo Running from project root...
) else if exist "..\winres\winres.json" (
    echo Running from winres folder, moving to project root...
    cd ..
) else (
    echo [ERROR] Cannot find winres.json file!
    pause
    exit /b 1
)

:: Configuration
set "APP_NAME=TribeDB"
set "BINARY=%APP_NAME%.exe"
set "MAIN_PACKAGE=.\cmd\server"

:: Version
for /f "delims=" %%i in ('git describe --tags --always --dirty 2^>nul') do set "VERSION=%%i"
if not defined VERSION set "VERSION=v1.0.0"

:: Commit
for /f "delims=" %%i in ('git rev-parse --short HEAD 2^>nul') do set "COMMIT=%%i"
if not defined COMMIT set "COMMIT=unknown"

:: Build Time
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH:mm:ss'"`) do set "BUILD_TIME=%%i"

:: ANSI Colors
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RED=[91m"
set "NC=[0m"

ver | find "10.0" >nul
if %errorlevel% equ 0 (
    set "GREEN=[92m"
    set "YELLOW=[93m"
    set "BLUE=[94m"
    set "RED=[91m"
    set "NC=[0m"
)

echo %BLUE%============================================%NC%
echo %GREEN%  %APP_NAME% - Social Graph Database Server%NC%
echo %BLUE%============================================%NC%
echo   Version    : %YELLOW%%VERSION%%NC%
echo   Commit     : %YELLOW%%COMMIT%%NC%
echo   Build Time : %YELLOW%%BUILD_TIME%%NC%
echo   Author     : %YELLOW%Alireza Askari%NC%
echo   Company    : %YELLOW%Social Tribe%NC%
echo %BLUE%============================================%NC%
echo.

:: Cleanup
del /Q "%MAIN_PACKAGE%\rsrc_windows_*.syso" >nul 2>&1

:: Generate Resources
echo %YELLOW%[1/3] Generating Windows resources...%NC%
go-winres make
if errorlevel 1 (
    echo %RED%[ERROR] Failed to generate Windows resources!%NC%
    pause
    exit /b 1
)

:: Copy Resources
echo %YELLOW%[2/3] Preparing resource files...%NC%
copy /Y "rsrc_windows_*.syso" "%MAIN_PACKAGE%\" >nul
if errorlevel 1 (
    echo %RED%[ERROR] Failed to copy resource files!%NC%
    pause
    exit /b 1
)

:: Build
echo %YELLOW%[3/3] Compiling %APP_NAME%...%NC%
go build ^
    -ldflags="-s -w -X main.Version=%VERSION% -X main.Commit=%COMMIT% -X main.BuildTime=%BUILD_TIME%" ^
    -o "%BINARY%" ^
    "%MAIN_PACKAGE%"

set "BUILD_RESULT=%errorlevel%"

:: Cleanup temporary syso files
del /Q "%MAIN_PACKAGE%\rsrc_windows_*.syso" >nul 2>&1
del /Q "rsrc_windows_*.syso" >nul 2>&1

if not "%BUILD_RESULT%"=="0" (
    echo %RED%[ERROR] Build failed!%NC%
    pause
    exit /b %BUILD_RESULT%
)

echo.
echo %GREEN%[SUCCESS] Build completed successfully!%NC%
echo.
echo %BLUE%============================================%NC%
echo %BLUE%  BUILD DETAILS%NC%
echo %BLUE%============================================%NC%

for %%i in ("%BINARY%") do set "FILESIZE=%%~zi"
set /a FILESIZE_MB=%FILESIZE%/1048576

echo    Binary     : %GREEN%%BINARY%%NC%
echo    Location   : %CD%\%BINARY%
echo    Size       : %YELLOW%%FILESIZE_MB% MB%NC%
echo    Version    : %YELLOW%%VERSION%%NC%

echo %BLUE%============================================%NC%
echo.
echo %GREEN%[READY] Run %BINARY% to start.%NC%
echo.

pause