@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   Building TribeBench Server
echo ============================================================
echo.

:: Check if cargo exists
where cargo >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Rust/Cargo not found!
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

:: Check Cargo.toml
if not exist "Cargo.toml" (
    echo [ERROR] Cargo.toml not found!
    echo Please run this script from the project root.
    pause
    exit /b 1
)

echo [1/3] Building release version...
echo This may take a few minutes...
echo.

:: Run cargo build and show output in real-time
cargo build --release

:: Check if build succeeded
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   ❌ BUILD FAILED!
    echo ============================================================
    echo.
    echo [ERROR] Build failed with error code: %errorlevel%
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   ✅ BUILD SUCCESSFUL!
echo ============================================================
echo.

:: Find only the main executable (not build scripts)
echo [2/3] Locating main executable...
echo.

set "MAIN_EXE="
for /r "target\release" %%f in (*.exe) do (
    set "FILE_PATH=%%f"
    set "FILE_NAME=%%~nxf"
    
    :: Skip build scripts and deps folder
    echo "%%f" | findstr /C:"\build\" >nul 2>nul
    if errorlevel 1 (
        echo "%%f" | findstr /C:"\deps\" >nul 2>nul
        if errorlevel 1 (
            echo "%%f" | findstr /C:"build-script" >nul 2>nul
            if errorlevel 1 (
                echo "%%f" | findstr /C:"build_script" >nul 2>nul
                if errorlevel 1 (
                    set "MAIN_EXE=%%f"
                    set "MAIN_EXE_NAME=%%~nxf"
                    echo [OK] Found main executable: %%~nxf
                    for %%A in ("%%f") do (
                        set "FILESIZE=%%~zA"
                        set /a "FILESIZE_MB=!FILESIZE!/1048576"
                        set /a "FILESIZE_KB=(!FILESIZE!-!FILESIZE_MB!*1048576)/1024"
                        echo [INFO] Size: !FILESIZE_MB! MB !FILESIZE_KB! KB
                    )
                    echo.
                    goto :found_exe
                )
            )
        )
    )
)

:found_exe
if not defined MAIN_EXE (
    echo [ERROR] Could not find main executable!
    echo [INFO] Found these executables in target\release:
    dir /b "target\release\*.exe" 2>nul
    echo.
    echo [INFO] Please copy the correct exe manually.
    pause
    exit /b 1
)

:: Create dist folder and copy only the main exe
echo [3/3] Copying to dist folder...
if not exist "dist" mkdir "dist" 2>nul

if exist "%MAIN_EXE%" (
    copy "%MAIN_EXE%" "dist\%MAIN_EXE_NAME%" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to copy: %MAIN_EXE_NAME%
    ) else (
        echo [OK] Copied: %MAIN_EXE_NAME%
        echo [OK] Location: dist\%MAIN_EXE_NAME%
    )
)

echo.
echo ============================================================
echo   📦 Build Complete!
echo ============================================================
echo.
echo Executable available in the 'dist' folder:
if exist "dist\%MAIN_EXE_NAME%" (
    echo   ✅ %MAIN_EXE_NAME%
    for %%A in ("dist\%MAIN_EXE_NAME%") do (
        set "FILESIZE=%%~zA"
        set /a "FILESIZE_MB=!FILESIZE!/1048576"
        set /a "FILESIZE_KB=(!FILESIZE!-!FILESIZE_MB!*1048576)/1024"
        echo      Size: !FILESIZE_MB! MB !FILESIZE_KB! KB
    )
)
echo.

:: Check build.rs status
echo Checking build.rs status...
if exist "build.rs" (
    echo [OK] build.rs found
    if exist "icon.ico" (
        echo [OK] icon.ico found
        echo [INFO] ✅ Icon should be embedded in the executable.
        echo [INFO] Right-click the EXE and check Properties ^> Details to verify.
    ) else (
        echo [WARN] icon.ico not found - icon will not be embedded
    )
)

echo.
echo Press any key to exit...
pause >nul
exit /b 0