#!/usr/bin/env python3

from __future__ import annotations

import argparse
import multiprocessing
import os
import shutil
import subprocess
import sys
from pathlib import Path


# ----------------------------------------------------------
# Helpers
# ----------------------------------------------------------

def info(msg: str):
    print(f"[INFO] {msg}")


def error(msg: str):
    print(f"[ERROR] {msg}")
    sys.exit(1)


def run(cmd: list[str]) -> None:
    print("\n" + "=" * 80)
    print(" ".join(cmd))
    print("=" * 80 + "\n")

    subprocess.run(cmd, check=True)


# ----------------------------------------------------------
# Main
# ----------------------------------------------------------

def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--mode",
        choices=["onefile", "standalone"],
        default="onefile",
        help="Build mode",
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable Nuitka debug output",
    )

    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent

    project_root = script_dir.parent.parent

    app_exe_dir = project_root / "server" / "app_exe"

    os.chdir(app_exe_dir)

    os.environ["PYTHONPATH"] = str(project_root / "server")

    info(f"Project Root : {project_root}")

    # ------------------------------------------------------
    # Check Nuitka
    # ------------------------------------------------------

    if shutil.which("python") is None:
        error("Python was not found.")

    try:
        import nuitka  # noqa
    except ImportError:
        error("Nuitka is not installed.")

    # ------------------------------------------------------
    # Locate tribecore
    # ------------------------------------------------------

    try:
        import tribecore
    except ImportError:
        error("tribecore is not installed.")

    tribecore_path = Path(tribecore.__file__).parent

    dll_name = {
        "win32": "graphcore.dll",
        "linux": "libgraphcore.so",
        "darwin": "libgraphcore.dylib",
    }.get(sys.platform)

    if dll_name is None:
        error(f"Unsupported platform: {sys.platform}")

    native_lib = tribecore_path / "_libs" / dll_name

    if not native_lib.exists():
        error(f"Native library not found:\n{native_lib}")

    info(f"tribecore : {tribecore_path}")
    info(f"Native Lib : {native_lib}")

    # ------------------------------------------------------
    # Output Name
    # ------------------------------------------------------

    output_name = "Tribe-Server"

    if os.name == "nt":
        output_name += ".exe"

    # ------------------------------------------------------
    # Nuitka Command
    # ------------------------------------------------------

    cmd = [
        sys.executable,
        "-m",
        "nuitka",

        "--deployment",
        "--remove-output",
        "--assume-yes-for-downloads",

        "--enable-plugin=anti-bloat",
        "--no-prefer-source-code",

        "--output-dir=dist",
        f"--output-filename={output_name}",

        f"--jobs={multiprocessing.cpu_count()}",

        # Always include the Python package
        "--include-package=tribecore",

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
    ]

    # ------------------------------------------------------
    # Native library handling
    # ------------------------------------------------------

    # Windows requires manually copying graphcore.dll because
    # Nuitka does not automatically bundle it.
    if sys.platform == "win32":
        cmd.append(
            f"--include-data-files={native_lib}=tribecore/_libs/{dll_name}"
        )

    # Linux/macOS:
    # libgraphcore.so / libgraphcore.dylib are native shared libraries.
    # Nuitka automatically detects and bundles them.
    # Adding them again with --include-data-files causes:
    #
    #     conflicts with extension
    #
    # Therefore nothing is added here.

    # ------------------------------------------------------
    # Build Mode
    # ------------------------------------------------------

    if args.mode == "onefile":
        cmd.append("--onefile")
    else:
        cmd.append("--standalone")

    # ------------------------------------------------------
    # Platform-specific options
    # ------------------------------------------------------

    if sys.platform == "win32":

        icon = app_exe_dir / "icon.ico"

        if icon.exists():
            cmd.append(f"--windows-icon-from-ico={icon}")

        cmd.append("--windows-console-mode=force")

    elif sys.platform == "darwin":

        icon = app_exe_dir / "icon.icns"

        if icon.exists():
            cmd.append(f"--macos-app-icon={icon}")

    # Linux:
    # Executable files do not support embedded icons.

    # ------------------------------------------------------
    # Debug options
    # ------------------------------------------------------

    if args.debug:
        cmd.extend(
            [
                "--show-modules",
                "--show-scons",
                "--verbose",
                "--report=build-report.xml",
            ]
        )

    # ------------------------------------------------------
    # Entry point
    # ------------------------------------------------------

    cmd.append(str((project_root / "server" / "main.py").resolve()))

    run(cmd)

    print("\n")
    print("=" * 80)
    print("Build completed successfully.")
    print("=" * 80)


if __name__ == "__main__":
    main()
