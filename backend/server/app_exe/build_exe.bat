@echo off
setlocal EnableExtensions

echo ========================================
echo Building Social Tribe API (Release)
echo ========================================

REM ===== Detect Paths Dynamically =====
REM %~dp0 = directory containing this BAT file
set "APP_EXE_DIR=%~dp0"

REM Project root is two levels above server\app_exe
for %%I in ("%APP_EXE_DIR%..\..") do set "PROJECT_ROOT=%%~fI"

echo Project Root:
echo   %PROJECT_ROOT%
echo.

REM ===== Change Working Directory =====
cd /d "%PROJECT_ROOT%\server\app_exe"

REM ===== Python Path =====
set "PYTHONPATH=%PROJECT_ROOT%\server"

for /f "delims=" %%i in ('python -c "import tribecore; print(tribecore.__path__[0])"') do set TRIBECORE_PATH=%%i


python -m nuitka ^
    --onefile ^
    --deployment ^
    --include-package=tribecore ^
    --include-data-files="%TRIBECORE_PATH%\_libs\graphcore.dll=tribecore\_libs\graphcore.dll" ^
    --assume-yes-for-downloads ^
    --remove-output ^
    --enable-plugin=anti-bloat ^
    --no-prefer-source-code ^
    --windows-console-mode=force ^
    --windows-icon-from-ico=icon.ico ^
    --output-dir=dist ^
    --output-filename=Tribe-Server.exe ^
    --jobs=4 ^
    --nofollow-import-to=pytest ^
    --nofollow-import-to=unittest ^
    --nofollow-import-to=setuptools ^
    --nofollow-import-to=tkinter ^
    --nofollow-import-to=IPython ^
    --nofollow-import-to=jupyter ^
    --nofollow-import-to=notebook ^
    --nofollow-import-to=sympy ^
    --nofollow-import-to=scipy.tests ^
    --nofollow-import-to=matplotlib.tests ^
    ..\main.py

if %errorlevel%==0 (
    echo.
    echo ========================================
    echo Build successful!
    echo ========================================
    echo.
    echo Executable:
    echo   %PROJECT_ROOT%\server\app_exe\dist\Tribe-Server.exe
    echo.
) else (
    echo.
    echo ========================================
    echo Build failed!
    echo Error Code: %errorlevel%
    echo ========================================
)

pause