#!/usr/bin/env python3
"""
TribeDB - Social Graph Database Server
Professional Cross-Platform Build Script
Author: Alireza Askari - Social Tribe
"""

import os
import sys
import subprocess
import shutil
import glob
import platform
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
import json
import re

# ============================================
# Configuration
# ============================================
APP_NAME = "TribeDB"
MAIN_PACKAGE = "./cmd/server"
WIN_RESOURCE_FILE = "winres/winres.json"

# ANSI Color Codes
COLORS = {
    'GREEN': '\033[92m',
    'YELLOW': '\033[93m',
    'BLUE': '\033[94m',
    'RED': '\033[91m',
    'NC': '\033[0m'
}

# Disable colors on Windows if not supported
if platform.system() == "Windows":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except:
        COLORS = {k: '' for k in COLORS}


class BuildError(Exception):
    """Custom exception for build failures"""
    pass


class TribeDBBuilder:
    """Main builder class for TribeDB"""
    
    def __init__(self):
        # First, detect OS
        self.current_os = platform.system()
        
        # Then initialize other attributes
        self.script_dir = Path(__file__).parent.absolute()
        self.project_root = self._find_project_root()
        self.version = self._get_git_version()
        self.commit = self._get_git_commit()
        self.build_time = datetime.now().strftime("%Y-%m-%d_%H:%M:%S")
        self.binary_name = self._get_binary_name()
        self.binary_path = self.project_root / self.binary_name
        
    def _find_project_root(self) -> Path:
        """Find the project root directory"""
        current = self.script_dir
        
        # Check if we're in project root
        if (current / WIN_RESOURCE_FILE).exists():
            return current
            
        # Check parent directory
        if (current.parent / WIN_RESOURCE_FILE).exists():
            return current.parent
            
        # Check if we're in winres directory
        if current.name == "winres" and (current / "winres.json").exists():
            return current.parent
            
        raise BuildError("Cannot find winres.json file! Make sure you're in the project root or winres directory.")
    
    def _get_git_version(self) -> str:
        """Get version from git tags"""
        try:
            result = subprocess.run(
                ["git", "describe", "--tags", "--always", "--dirty"],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
        return "v1.0.0"
    
    def _get_git_commit(self) -> str:
        """Get short commit hash from git"""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
        return "unknown"
    
    def _get_binary_name(self) -> str:
        """Get binary name based on OS"""
        if self.current_os == "Windows":
            return f"{APP_NAME}.exe"
        return APP_NAME
    
    def _print_header(self):
        """Print build header"""
        print(f"{COLORS['BLUE']}============================================{COLORS['NC']}")
        print(f"{COLORS['GREEN']}  {APP_NAME} - Social Graph Database Server{COLORS['NC']}")
        print(f"{COLORS['BLUE']}============================================{COLORS['NC']}")
        print(f"  Version    : {COLORS['YELLOW']}{self.version}{COLORS['NC']}")
        print(f"  Commit     : {COLORS['YELLOW']}{self.commit}{COLORS['NC']}")
        print(f"  Build Time : {COLORS['YELLOW']}{self.build_time}{COLORS['NC']}")
        print(f"  Author     : {COLORS['YELLOW']}Alireza Askari{COLORS['NC']}")
        print(f"  Company    : {COLORS['YELLOW']}Social Tribe{COLORS['NC']}")
        print(f"  OS         : {COLORS['YELLOW']}{self.current_os} {platform.release()}{COLORS['NC']}")
        print(f"{COLORS['BLUE']}============================================{COLORS['NC']}")
        print()
    
    def _run_command(self, cmd: list, cwd: Optional[Path] = None, 
                    check: bool = True, capture: bool = False) -> Tuple[int, str, str]:
        """Run a command with proper error handling"""
        try:
            if capture:
                result = subprocess.run(
                    cmd,
                    cwd=str(cwd) if cwd else None,
                    capture_output=True,
                    text=True,
                    check=check
                )
                return result.returncode, result.stdout, result.stderr
            else:
                result = subprocess.run(
                    cmd,
                    cwd=str(cwd) if cwd else None,
                    check=check
                )
                return result.returncode, "", ""
        except subprocess.CalledProcessError as e:
            return e.returncode, "", str(e)
        except FileNotFoundError:
            raise BuildError(f"Command not found: {' '.join(cmd)}")
    
    def _check_dependencies(self):
        """Check required tools"""
        required_tools = ["go"]
        
        # go-winres فقط برای ویندوز نیاز است
        if self.current_os == "Windows":
            required_tools.append("go-winres")
        
        missing = []
        for tool in required_tools:
            if not shutil.which(tool):
                missing.append(tool)
        
        if missing:
            raise BuildError(f"Missing required tools: {', '.join(missing)}. Please install them first.")
    
    def _cleanup_syso_files(self, directory: Path):
        """Clean up temporary .syso files (only on Windows)"""
        if self.current_os != "Windows":
            return
            
        syso_files = list(directory.glob("rsrc_windows_*.syso"))
        for file in syso_files:
            try:
                file.unlink()
                print(f"  Removed: {file.name}")
            except OSError as e:
                print(f"  Warning: Could not remove {file.name}: {e}")
    
    def _generate_resources(self):
        """Generate Windows resources (Windows only)"""
        if self.current_os != "Windows":
            print(f"{COLORS['YELLOW']}[1/3] Skipping Windows resources (not needed on {self.current_os}){COLORS['NC']}")
            return
            
        print(f"{COLORS['YELLOW']}[1/3] Generating Windows resources...{COLORS['NC']}")
        
        # Change to project root for resource generation
        original_cwd = os.getcwd()
        try:
            os.chdir(str(self.project_root))
            
            # Check if winres.json exists
            if not (self.project_root / "winres" / "winres.json").exists():
                print(f"{COLORS['YELLOW']}  No winres.json found, skipping resource generation.{COLORS['NC']}")
                return
            
            # Run go-winres
            returncode, stdout, stderr = self._run_command(
                ["go-winres", "make"],
                cwd=self.project_root,
                capture=True
            )
            
            if returncode != 0:
                raise BuildError(f"go-winres failed: {stderr}")
            
            print(f"  {COLORS['GREEN']}Resources generated successfully{COLORS['NC']}")
            
        finally:
            os.chdir(original_cwd)
    
    def _copy_resources(self):
        """Copy generated resources to main package (Windows only)"""
        if self.current_os != "Windows":
            return
            
        print(f"{COLORS['YELLOW']}[2/3] Preparing resource files...{COLORS['NC']}")
        
        # Find generated syso files in project root
        syso_files = list(self.project_root.glob("rsrc_windows_*.syso"))
        
        if not syso_files:
            print(f"{COLORS['YELLOW']}  No syso files found, skipping copy.{COLORS['NC']}")
            return
        
        # Create main package directory if needed
        main_pkg_path = self.project_root / MAIN_PACKAGE.lstrip("./")
        main_pkg_path.mkdir(parents=True, exist_ok=True)
        
        # Copy each syso file
        for syso_file in syso_files:
            dest = main_pkg_path / syso_file.name
            try:
                shutil.copy2(syso_file, dest)
                print(f"  Copied: {syso_file.name} -> {dest}")
            except OSError as e:
                raise BuildError(f"Failed to copy {syso_file.name}: {e}")
    
    def _build_binary(self):
        """Build the Go binary"""
        print(f"{COLORS['YELLOW']}[2/3] Compiling {APP_NAME}...{COLORS['NC']}")
        
        # Build ldflags
        ldflags = (
            f"-s -w "
            f"-X main.Version={self.version} "
            f"-X main.Commit={self.commit} "
            f"-X main.BuildTime={self.build_time}"
        )
        
        # Build command
        cmd = [
            "go", "build",
            "-ldflags", ldflags,
            "-o", str(self.binary_path),
            MAIN_PACKAGE
        ]
        
        # Add trimpath for reproducible builds
        cmd.insert(2, "-trimpath")
        
        print(f"  Running: {' '.join(cmd)}")
        print(f"  Working directory: {self.project_root}")
        
        # Build the binary
        returncode, stdout, stderr = self._run_command(
            cmd,
            cwd=self.project_root,
            capture=True
        )
        
        if returncode != 0:
            raise BuildError(f"Build failed!\n{stderr}")
        
        print(f"  {COLORS['GREEN']}Build completed successfully{COLORS['NC']}")
    
    def _print_success(self):
        """Print build success information"""
        if not self.binary_path.exists():
            raise BuildError(f"Binary not found at {self.binary_path}")
        
        # Get file size
        size_bytes = self.binary_path.stat().st_size
        size_mb = size_bytes / (1024 * 1024)
        
        print()
        print(f"{COLORS['GREEN']}[SUCCESS] Build completed successfully!{COLORS['NC']}")
        print()
        print(f"{COLORS['BLUE']}============================================{COLORS['NC']}")
        print(f"{COLORS['BLUE']}  BUILD DETAILS{COLORS['NC']}")
        print(f"{COLORS['BLUE']}============================================{COLORS['NC']}")
        print(f"  Binary     : {COLORS['GREEN']}{self.binary_path.name}{COLORS['NC']}")
        print(f"  Location   : {self.binary_path}")
        print(f"  Size       : {COLORS['YELLOW']}{size_mb:.2f} MB{COLORS['NC']}")
        print(f"  Version    : {COLORS['YELLOW']}{self.version}{COLORS['NC']}")
        print(f"  OS         : {COLORS['YELLOW']}{self.current_os}{COLORS['NC']}")
        print(f"{COLORS['BLUE']}============================================{COLORS['NC']}")
        print()
        print(f"{COLORS['GREEN']}[READY] Run {self.binary_path.name} to start.{COLORS['NC']}")
        print()
    
    def build(self):
        """Main build process"""
        try:
            # Check dependencies
            self._check_dependencies()
            
            # Print header
            self._print_header()
            
            # Change to project root
            os.chdir(str(self.project_root))
            
            # Clean up old syso files (Windows only)
            if self.current_os == "Windows":
                print(f"{COLORS['YELLOW']}[0/3] Cleaning up old resource files...{COLORS['NC']}")
                main_pkg_path = self.project_root / MAIN_PACKAGE.lstrip("./")
                self._cleanup_syso_files(self.project_root)
                self._cleanup_syso_files(main_pkg_path)
                print()
            
            # Build steps
            self._generate_resources()
            self._copy_resources()
            self._build_binary()
            
            # Clean up syso files after build (Windows only)
            if self.current_os == "Windows":
                print(f"{COLORS['YELLOW']}Cleaning up temporary files...{COLORS['NC']}")
                main_pkg_path = self.project_root / MAIN_PACKAGE.lstrip("./")
                self._cleanup_syso_files(self.project_root)
                self._cleanup_syso_files(main_pkg_path)
                print()
            
            # Print success
            self._print_success()
            
            return 0
            
        except BuildError as e:
            print(f"{COLORS['RED']}[ERROR] {str(e)}{COLORS['NC']}")
            return 1
        except KeyboardInterrupt:
            print(f"\n{COLORS['YELLOW']}Build cancelled by user{COLORS['NC']}")
            return 1
        except Exception as e:
            print(f"{COLORS['RED']}[ERROR] Unexpected error: {str(e)}{COLORS['NC']}")
            import traceback
            traceback.print_exc()
            return 1


def main():
    """Entry point"""
    builder = TribeDBBuilder()
    sys.exit(builder.build())


if __name__ == "__main__":
    main()
