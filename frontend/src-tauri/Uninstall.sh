#!/bin/bash

# ============================================================================
# Social Tribe - Complete Uninstall Script (Enhanced)
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}========================================${NC}"
echo -e "${RED}🧹 Social Tribe - Complete Uninstall${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Check sudo
if ! sudo -v; then
    echo -e "${RED}❌ Sudo access required!${NC}"
    exit 1
fi

# ============================================================================
# 1. Kill all running processes
# ============================================================================
echo -e "${YELLOW}📌 [1/8] Killing running processes...${NC}"

PROCESSES=(
    "social-tribe"
    "SociaTribe"
    "benchmark-server"
    "tribe-backend-server"
    "tribe-database"
    "tribe-backend"
    "Tribe-Server"
    "TribeDB"
    "TribeBench"
)

KILLED=0
for proc in "${PROCESSES[@]}"; do
    PIDS=$(pgrep -f "$proc" 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo -e "  ${BLUE}→ Killing: $proc${NC}"
        echo "$PIDS" | while read -r pid; do
            echo "    PID: $pid"
        done
        sudo pkill -TERM -f "$proc" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if pgrep -f "$proc" > /dev/null 2>&1; then
            echo -e "    ${YELLOW}⚠ Force killing...${NC}"
            sudo pkill -9 -f "$proc" 2>/dev/null || true
        fi
        KILLED=$((KILLED + 1))
    fi
done

echo -e "${GREEN}  ✅ Killed $KILLED process(es)${NC}"
echo ""

# ============================================================================
# 2. Free all related ports
# ============================================================================
echo -e "${YELLOW}📌 [2/8] Freeing ports...${NC}"

PORTS=(50051 50052 3001 3000 8080 8443)

for port in "${PORTS[@]}"; do
    PIDS=$(sudo lsof -t -i ":$port" 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo -e "  ${BLUE}→ Freeing port $port${NC}"
        echo "$PIDS" | while read -r pid; do
            echo "    PID: $pid"
            sudo kill -9 "$pid" 2>/dev/null || true
        done
    fi
done

echo -e "${GREEN}  ✅ Ports freed${NC}"
echo ""

# ============================================================================
# 3. Remove RPM packages (Force remove all versions)
# ============================================================================
echo -e "${YELLOW}📌 [3/8] Removing RPM packages...${NC}"

# Find all social-tribe packages
INSTALLED_PKGS=$(rpm -qa | grep -i "social.*tribe" || true)

if [ -n "$INSTALLED_PKGS" ]; then
    echo "$INSTALLED_PKGS" | while read -r pkg; do
        echo -e "  ${BLUE}→ Removing: $pkg${NC}"
        sudo rpm -e --nodeps "$pkg" 2>/dev/null || true
    done
    # Also try dnf remove
    sudo dnf remove -y "*social*tribe*" 2>/dev/null || true
else
    echo "  No packages found"
fi

echo -e "${GREEN}  ✅ Packages removed${NC}"
echo ""

# ============================================================================
# 4. Remove all binaries and libraries
# ============================================================================
echo -e "${YELLOW}📌 [4/8] Removing binaries and libraries...${NC}"

# Binary files
BINARIES=(
    "/usr/bin/social-tribe"
    "/usr/bin/SociaTribe"
    "/usr/bin/Social Tribe"
    "/usr/bin/tribe-backend-server"
    "/usr/bin/tribe-database"
    "/usr/bin/benchmark-server"
    "/usr/local/bin/social-tribe"
    "/usr/local/bin/SociaTribe"
    "/usr/local/bin/tribe-backend-server"
    "/usr/local/bin/tribe-database"
    "/usr/local/bin/benchmark-server"
)

REMOVED_BINS=0
for bin in "${BINARIES[@]}"; do
    if [ -f "$bin" ] || [ -L "$bin" ]; then
        echo -e "  ${BLUE}→ Removing: $bin${NC}"
        sudo rm -f "$bin"
        REMOVED_BINS=$((REMOVED_BINS + 1))
    fi
done

# Library files (if any)
LIB_DIRS=(
    "/usr/lib/social-tribe"
    "/usr/lib64/social-tribe"
    "/usr/lib/SocialTribe"
    "/usr/lib64/SocialTribe"
    "/usr/share/social-tribe"
    "/usr/share/SocialTribe"
)

for lib in "${LIB_DIRS[@]}"; do
    if [ -d "$lib" ]; then
        echo -e "  ${BLUE}→ Removing: $lib${NC}"
        sudo rm -rf "$lib"
        REMOVED_BINS=$((REMOVED_BINS + 1))
    fi
done

echo -e "${GREEN}  ✅ Removed $REMOVED_BINS binary/library item(s)${NC}"
echo ""

# ============================================================================
# 5. Remove desktop and icon files
# ============================================================================
echo -e "${YELLOW}📌 [5/8] Removing desktop entries and icons...${NC}"

# Desktop files
DESKTOP_PATHS=(
    "/usr/share/applications"
    "/usr/local/share/applications"
    "$HOME/.local/share/applications"
)

DESKTOP_NAMES=(
    "social-tribe"
    "Social Tribe"
    "SocialTribe"
    "Social-Tribe"
)

REMOVED_DESKTOP=0
for path in "${DESKTOP_PATHS[@]}"; do
    for name in "${DESKTOP_NAMES[@]}"; do
        if [ -f "$path/$name.desktop" ]; then
            echo -e "  ${BLUE}→ Removing: $path/$name.desktop${NC}"
            rm -f "$path/$name.desktop" 2>/dev/null || sudo rm -f "$path/$name.desktop"
            REMOVED_DESKTOP=$((REMOVED_DESKTOP + 1))
        fi
    done
done

# Icon files
ICON_DIRS=(
    "/usr/share/icons/hicolor"
    "/usr/share/pixmaps"
    "$HOME/.local/share/icons"
)

ICON_NAMES=(
    "social-tribe"
    "SocialTribe"
    "social_tribe"
)

for dir in "${ICON_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        for name in "${ICON_NAMES[@]}"; do
            FOUND_ICONS=$(find "$dir" -name "*$name*" -type f 2>/dev/null || true)
            if [ -n "$FOUND_ICONS" ]; then
                echo "$FOUND_ICONS" | while read -r icon; do
                    echo -e "  ${BLUE}→ Removing: $icon${NC}"
                    rm -f "$icon" 2>/dev/null || sudo rm -f "$icon"
                done
                REMOVED_DESKTOP=$((REMOVED_DESKTOP + 1))
            fi
        done
    fi
done

# Update caches
sudo update-desktop-database 2>/dev/null || true
update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
sudo gtk-update-icon-cache /usr/share/icons/hicolor/ 2>/dev/null || true

echo -e "${GREEN}  ✅ Removed $REMOVED_DESKTOP desktop/icon item(s)${NC}"
echo ""

# ============================================================================
# 6. Remove application data and config
# ============================================================================
echo -e "${YELLOW}📌 [6/8] Removing application data...${NC}"

DATA_DIRS=(
    # XDG directories
    "$HOME/.local/share/SocialTribe"
    "$HOME/.local/share/social-tribe"
    "$HOME/.config/SocialTribe"
    "$HOME/.config/social-tribe"
    "$HOME/.cache/SocialTribe"
    "$HOME/.cache/social-tribe"
    # Legacy directories
    "$HOME/.SocialTribe"
    "$HOME/.social-tribe"
    "$HOME/social-tribe"
    # Snapshots directory
    "$HOME/.local/share/SocialTribe/snapshots"
    # Store directory
    "$HOME/.local/share/SocialTribe/store"
    # Temp directories
    "/tmp/SocialTribe"
    "/tmp/social-tribe"
    "/tmp/.tmp*" # Nuitka onefile temp (be careful)
)

REMOVED_DATA=0
for dir in "${DATA_DIRS[@]}"; do
    # Expand glob safely
    for expanded in $dir; do
        if [ -d "$expanded" ] || [ -f "$expanded" ]; then
            echo -e "  ${BLUE}→ Removing: $expanded${NC}"
            rm -rf "$expanded" 2>/dev/null || sudo rm -rf "$expanded"
            REMOVED_DATA=$((REMOVED_DATA + 1))
        fi
    done
done

# Clean Nuitka temp files specifically
NUITKA_TMP=$(find /tmp -maxdepth 1 -type d -name "onefile_*" -user "$USER" 2>/dev/null || true)
if [ -n "$NUITKA_TMP" ]; then
    echo -e "  ${BLUE}→ Removing Nuitka temp files...${NC}"
    echo "$NUITKA_TMP" | while read -r tmpdir; do
        echo "    $tmpdir"
        rm -rf "$tmpdir" 2>/dev/null || true
    done
    REMOVED_DATA=$((REMOVED_DATA + 1))
fi

echo -e "${GREEN}  ✅ Removed $REMOVED_DATA data item(s)${NC}"
echo ""

# ============================================================================
# 7. Clean systemd services
# ============================================================================
echo -e "${YELLOW}📌 [7/8] Cleaning systemd services...${NC}"

SYSTEMD_SERVICES=(
    "social-tribe"
    "social-tribe.service"
    "tribe-backend"
    "tribe-backend.service"
    "tribe-database"
    "tribe-database.service"
)

REMOVED_SERVICES=0
for svc in "${SYSTEMD_SERVICES[@]}"; do
    # Check in system and user services
    for scope in "system" "user"; do
        if [ "$scope" = "user" ]; then
            UNIT_FILES=$(systemctl --user list-unit-files --all 2>/dev/null | grep -i "$svc" || true)
        else
            UNIT_FILES=$(systemctl list-unit-files --all 2>/dev/null | grep -i "$svc" || true)
        fi
        
        if [ -n "$UNIT_FILES" ]; then
            echo -e "  ${BLUE}→ Stopping $scope service: $svc${NC}"
            if [ "$scope" = "user" ]; then
                systemctl --user stop "$svc" 2>/dev/null || true
                systemctl --user disable "$svc" 2>/dev/null || true
            else
                sudo systemctl stop "$svc" 2>/dev/null || true
                sudo systemctl disable "$svc" 2>/dev/null || true
            fi
            REMOVED_SERVICES=$((REMOVED_SERVICES + 1))
        fi
    done
    
    # Remove service files
    for svc_path in "/etc/systemd/system/$svc" "/etc/systemd/system/$svc.service" "$HOME/.config/systemd/user/$svc" "$HOME/.config/systemd/user/$svc.service"; do
        if [ -f "$svc_path" ]; then
            echo -e "  ${BLUE}→ Removing: $svc_path${NC}"
            sudo rm -f "$svc_path" 2>/dev/null || rm -f "$svc_path"
        fi
    done
done

sudo systemctl daemon-reload 2>/dev/null || true
systemctl --user daemon-reload 2>/dev/null || true

echo -e "${GREEN}  ✅ Cleaned $REMOVED_SERVICES service(s)${NC}"
echo ""

# ============================================================================
# 8. Clean package manager cache
# ============================================================================
echo -e "${YELLOW}📌 [8/8] Cleaning package cache...${NC}"

# Clean DNF cache for this package
sudo dnf clean packages --disablerepo="*" --enablerepo="@commandline" 2>/dev/null || true
sudo dnf makecache 2>/dev/null || true

echo -e "${GREEN}  ✅ Package cache cleaned${NC}"
echo ""

# ============================================================================
# Final Verification
# ============================================================================
echo -e "${RED}========================================${NC}"
echo -e "${GREEN}✅ Uninstall Complete!${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# Check remaining
REMAINING_PROCS=$(ps aux | grep -iE "social.tribe|tribe.backend|tribe.database|benchmark.server" | grep -v grep | wc -l)
REMAINING_BINS=$(find /usr/bin /usr/local/bin -name "*tribe*" -o -name "*social*" -o -name "*benchmark*" 2>/dev/null | grep -v "cargo" | wc -l)
REMAINING_DESKTOP=$(find /usr/share/applications "$HOME/.local/share/applications" -name "*tribe*" -o -name "*social*" 2>/dev/null | wc -l)
REMAINING_DATA=$(find "$HOME/.local/share" "$HOME/.config" "$HOME/.cache" -maxdepth 2 -name "*SocialTribe*" -o -name "*social-tribe*" 2>/dev/null | wc -l)

echo -e "${YELLOW}📋 Verification:${NC}"
echo -e "  Processes running: ${RED}$REMAINING_PROCS${NC}"
echo -e "  Binary files remaining: ${RED}$REMAINING_BINS${NC}"
echo -e "  Desktop files remaining: ${RED}$REMAINING_DESKTOP${NC}"
echo -e "  Data files remaining: ${RED}$REMAINING_DATA${NC}"
echo ""

if [ "$REMAINING_PROCS" -eq 0 ] && [ "$REMAINING_BINS" -eq 0 ] && [ "$REMAINING_DESKTOP" -eq 0 ] && [ "$REMAINING_DATA" -eq 0 ]; then
    echo -e "${GREEN}🎉 All traces removed successfully!${NC}"
else
    echo -e "${YELLOW}⚠ Some items remain. You may need to remove them manually.${NC}"
    
    # Show remaining items
    if [ "$REMAINING_BINS" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Remaining binaries:${NC}"
        find /usr/bin /usr/local/bin -name "*tribe*" -o -name "*social*" -o -name "*benchmark*" 2>/dev/null | grep -v "cargo"
    fi
    
    if [ "$REMAINING_DATA" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Remaining data files:${NC}"
        find "$HOME/.local/share" "$HOME/.config" "$HOME/.cache" -maxdepth 2 -name "*SocialTribe*" -o -name "*social-tribe*" 2>/dev/null
    fi
fi

echo ""
echo -e "${GREEN}✅ Ready for fresh installation!${NC}"
echo ""

# Optional: Restart services
read -p "Do you want to restart GNOME Shell? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔄 Restarting GNOME Shell...${NC}"
    if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
        echo -e "${YELLOW}⚠ On Wayland, please logout and login manually.${NC}"
    else
        gnome-shell --replace &>/dev/null &
        echo -e "${GREEN}✅ GNOME Shell restarted${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}💡 Tip: After uninstall, reboot or logout/login for complete cleanup.${NC}"

exit 0