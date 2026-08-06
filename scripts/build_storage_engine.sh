#!/bin/bash
# build_storage_engine.sh
# Build script for TribeDB - Social Graph Database Server
# Author: Alireza Askari
# Company: Social Tribe

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="TribeDB"
RELEASE=false
NO_RESOURCES=false
OUTPUT_DIR="."
ARCH="amd64"
OS="linux"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --release)
            RELEASE=true
            shift
            ;;
        --no-resources)
            NO_RESOURCES=true
            shift
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --arch)
            ARCH="$2"
            shift 2
            ;;
        --os)
            OS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --release        Build in release mode"
            echo "  --no-resources   Skip Windows resources generation"
            echo "  --output-dir     Output directory (default: .)"
            echo "  --arch           Target architecture (default: amd64)"
            echo "  --os             Target OS: windows, linux, darwin (default: linux)"
            echo "  --help           Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}[ERROR] Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${CYAN}Script directory: $SCRIPT_DIR${NC}"

# Go to project root (backend/graph-storage)
PROJECT_ROOT="$SCRIPT_DIR/../backend/graph-storage"
if [[ ! -d "$PROJECT_ROOT" ]]; then
    echo -e "${RED}[ERROR] Cannot find project root at: $PROJECT_ROOT${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"
echo -e "${GREEN}Project root: $PROJECT_ROOT${NC}"

# Set binary name based on OS
if [[ "$OS" == "windows" ]]; then
    BINARY_NAME="${APP_NAME}.exe"
else
    BINARY_NAME="${APP_NAME}"
fi

# Validate Windows-specific files
if [[ "$OS" == "windows" ]]; then
    WINRES_DIR="$PROJECT_ROOT/winres"
    ICON_PATH="$WINRES_DIR/tribedb-icon.png"
    WINRES_JSON="$WINRES_DIR/winres.json"
    
    if [[ ! -f "$WINRES_JSON" ]]; then
        echo -e "${RED}[ERROR] winres.json not found at: $WINRES_JSON${NC}"
        exit 1
    fi
    
    if [[ ! -f "$ICON_PATH" ]]; then
        echo -e "${YELLOW}[WARNING] Icon file not found at: $ICON_PATH${NC}"
        echo -e "${YELLOW}Will use default icon if available${NC}"
    fi
fi

# Get version from git
if VERSION=$(git describe --tags --always --dirty 2>/dev/null); then
    VERSION="${VERSION#v}"
else
    VERSION="1.0.0"
fi

# Get commit hash
if COMMIT=$(git rev-parse --short HEAD 2>/dev/null); then
    :
else
    COMMIT="unknown"
fi

# Get build time
BUILD_TIME=$(date '+%Y-%m-%d_%H:%M:%S')
BUILD_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Set build mode
if [[ "$RELEASE" == true ]]; then
    BUILD_MODE="release"
    IS_RELEASE="true"
else
    BUILD_MODE="debug"
    IS_RELEASE="false"
fi

# Set ldflags
LDFLAGS="-s -w -X 'main.Version=$VERSION' -X 'main.Commit=$COMMIT' -X 'main.BuildTime=$BUILD_TIME' -X 'main.BuildMode=$BUILD_MODE' -X 'main.IsRelease=$IS_RELEASE'"

# Print banner
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  $APP_NAME - Social Graph Database Server${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "  Version    : ${YELLOW}$VERSION${NC}"
echo -e "  Commit     : ${YELLOW}$COMMIT${NC}"
echo -e "  Build Time : ${YELLOW}$BUILD_TIME${NC}"
echo -e "  Build Mode : ${YELLOW}$BUILD_MODE${NC}"
echo -e "  OS         : ${YELLOW}$OS${NC}"
echo -e "  Arch       : ${YELLOW}$ARCH${NC}"
echo -e "  Author     : ${YELLOW}Alireza Askari${NC}"
echo -e "  Company    : ${YELLOW}Social Tribe${NC}"
echo -e "  Project    : ${CYAN}$PROJECT_ROOT${NC}"
if [[ "$OS" == "windows" ]]; then
    echo -e "  Icon Path  : ${YELLOW}$ICON_PATH${NC}"
fi
echo -e "${BLUE}============================================${NC}"
echo ""

# Step 1: Generate Windows resources (only for Windows builds)
if [[ "$OS" == "windows" && "$NO_RESOURCES" == false ]]; then
    echo -e "${YELLOW}[1/3] Generating Windows resources...${NC}"
    if ! command -v go-winres &> /dev/null; then
        echo -e "${YELLOW}go-winres not found, installing...${NC}"
        go install github.com/tc-hib/go-winres@latest
    fi
    
    # Change to winres directory
    cd "$WINRES_DIR"
    
    echo -e "${CYAN}Generating resources from: $WINRES_DIR${NC}"
    if [[ -f "tribedb-icon.png" ]]; then
        echo -e "${CYAN}Using icon: tribedb-icon.png${NC}"
        go-winres make -in winres.json -icon tribedb-icon.png
    else
        echo -e "${YELLOW}No icon found, generating without icon${NC}"
        go-winres make -in winres.json
    fi
    
    WINRES_RESULT=$?
    cd "$PROJECT_ROOT"
    
    if [[ $WINRES_RESULT -eq 0 ]]; then
        echo -e "${GREEN}Windows resources generated successfully!${NC}"
    else
        echo -e "${RED}[ERROR] Failed to generate Windows resources!${NC}"
        exit 1
    fi
else
    if [[ "$OS" == "windows" ]]; then
        echo -e "${YELLOW}[1/3] Skipping Windows resources generation${NC}"
    else
        echo -e "${YELLOW}[1/3] Skipping Windows resources (not a Windows build)${NC}"
    fi
fi

# Step 2: Clean previous builds
echo -e "${YELLOW}[2/3] Cleaning previous builds...${NC}"
rm -f "$BINARY_NAME" 2>/dev/null || true
if [[ "$OS" == "windows" ]]; then
    rm -f *.syso 2>/dev/null || true
fi
echo -e "${GREEN}Cleaned successfully${NC}"

# Step 3: Build
echo -e "${YELLOW}[3/3] Compiling $APP_NAME for $OS/$ARCH...${NC}"

# Set build flags
BUILD_FLAGS=(
    "build"
    "-ldflags=\"$LDFLAGS\""
    "-trimpath"
    "-o"
    "$OUTPUT_DIR/$BINARY_NAME"
)

if [[ "$RELEASE" == true ]]; then
    BUILD_FLAGS+=("-tags=release")
fi

# Set environment variables for cross-compilation
export GOOS="$OS"
export GOARCH="$ARCH"

# Build command
BUILD_CMD="go ${BUILD_FLAGS[*]}"
echo -e "${CYAN}Running: $BUILD_CMD${NC}"
echo -e "${CYAN}Working directory: $PROJECT_ROOT${NC}"

if eval "$BUILD_CMD"; then
    echo -e "${GREEN}Build completed successfully!${NC}"
else
    echo -e "${RED}[ERROR] Build failed!${NC}"
    exit 1
fi

# Show results
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  BUILD DETAILS${NC}"
echo -e "${BLUE}============================================${NC}"

# Get file info
if [[ -f "$OUTPUT_DIR/$BINARY_NAME" ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        FILE_SIZE=$(stat -f%z "$OUTPUT_DIR/$BINARY_NAME" 2>/dev/null || echo "0")
    else
        FILE_SIZE=$(stat -c%s "$OUTPUT_DIR/$BINARY_NAME" 2>/dev/null || echo "0")
    fi
    
    if [[ "$FILE_SIZE" != "0" ]]; then
        FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc 2>/dev/null || echo "?")
        FILE_SIZE_KB=$(echo "scale=2; $FILE_SIZE / 1024" | bc 2>/dev/null || echo "?")
        
        echo -e "  Binary     : ${GREEN}$OUTPUT_DIR/$BINARY_NAME${NC}"
        echo -e "  Location   : $(realpath "$OUTPUT_DIR/$BINARY_NAME" 2>/dev/null || echo "$OUTPUT_DIR/$BINARY_NAME")"
        echo -e "  Size       : ${YELLOW}$FILE_SIZE_MB MB ($FILE_SIZE_KB KB)${NC}"
        echo -e "  Version    : ${YELLOW}$VERSION${NC}"
        echo -e "  Commit     : ${YELLOW}$COMMIT${NC}"
        echo -e "  Build Time : ${YELLOW}$BUILD_TIME${NC}"
        echo -e "  Build Mode : ${YELLOW}$BUILD_MODE${NC}"
        echo -e "  OS/Arch    : ${YELLOW}$OS/$ARCH${NC}"
        
        if [[ "$OS" == "windows" ]]; then
            echo -e "  Icon       : ${GREEN}Embedded from tribedb-icon.png${NC}"
        fi
    fi
else
    echo -e "  ${RED}[WARNING] Binary not found at: $OUTPUT_DIR/$BINARY_NAME${NC}"
fi

echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}[READY] Run $BINARY_NAME to start.${NC}"
echo ""

# Return build info
echo "BUILD_INFO:{\"version\":\"$VERSION\",\"commit\":\"$COMMIT\",\"build_time\":\"$BUILD_TIME\",\"os\":\"$OS\",\"arch\":\"$ARCH\"}"