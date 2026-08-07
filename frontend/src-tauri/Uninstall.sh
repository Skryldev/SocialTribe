#!/bin/bash

# ============================================================================
# Social Tribe - Complete Uninstall Script (Refactored)
# ============================================================================

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Application patterns
readonly APP_PATTERNS=(
    "social-tribe"
    "SocialTribe"
    "tribe"
    "benchmark"
)

# Processes to kill
readonly PROCESSES=(
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

# Ports to free
readonly PORTS=(50051 50052 3001 3000 8080 8443)

# Binary paths
readonly BINARY_PATHS=(
    "/usr/bin"
    "/usr/local/bin"
)

# Binary names
readonly BINARY_NAMES=(
    "social-tribe"
    "SociaTribe"
    "Social Tribe"
    "tribe-backend-server"
    "tribe-database"
    "benchmark-server"
)

# Library directories
readonly LIB_DIRS=(
    "/usr/lib/social-tribe"
    "/usr/lib64/social-tribe"
    "/usr/lib/SocialTribe"
    "/usr/lib64/SocialTribe"
    "/usr/share/social-tribe"
    "/usr/share/SocialTribe"
)

# Desktop paths
readonly DESKTOP_PATHS=(
    "/usr/share/applications"
    "/usr/local/share/applications"
    "$HOME/.local/share/applications"
)

# Desktop names
readonly DESKTOP_NAMES=(
    "social-tribe"
    "Social Tribe"
    "SocialTribe"
    "Social-Tribe"
)

# Icon directories
readonly ICON_DIRS=(
    "/usr/share/icons/hicolor"
    "/usr/share/pixmaps"
    "$HOME/.local/share/icons"
)

# Icon names
readonly ICON_NAMES=(
    "social-tribe"
    "SocialTribe"
    "social_tribe"
)

# Data directories
readonly DATA_DIRS=(
    "$HOME/.local/share/SocialTribe"
    "$HOME/.local/share/social-tribe"
    "$HOME/.config/SocialTribe"
    "$HOME/.config/social-tribe"
    "$HOME/.cache/SocialTribe"
    "$HOME/.cache/social-tribe"
    "$HOME/.SocialTribe"
    "$HOME/.social-tribe"
    "$HOME/social-tribe"
    "$HOME/.local/share/SocialTribe/snapshots"
    "$HOME/.local/share/SocialTribe/store"
    "/tmp/SocialTribe"
    "/tmp/social-tribe"
)

# Systemd services
readonly SYSTEMD_SERVICES=(
    "social-tribe"
    "social-tribe.service"
    "tribe-backend"
    "tribe-backend.service"
    "tribe-database"
    "tribe-database.service"
)

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}$1${NC}"
    echo -e "${RED}========================================${NC}"
}

print_step() {
    echo -e "${YELLOW}📌 $1${NC}"
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}  → $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

require_sudo() {
    if ! sudo -v 2>/dev/null; then
        print_error "Sudo access required!"
        exit 1
    fi
}

safe_kill() {
    local proc="$1"
    local signal="${2:-TERM}"
    if pgrep -f "$proc" > /dev/null 2>&1; then
        sudo pkill -"$signal" -f "$proc" 2>/dev/null || true
        return 0
    fi
    return 1
}

# ============================================================================
# Main Functions
# ============================================================================

kill_processes() {
    print_step "[1/8] Killing running processes..."
    local killed=0
    
    for proc in "${PROCESSES[@]}"; do
        if pgrep -f "$proc" > /dev/null 2>&1; then
            print_info "Killing: $proc"
            local pids=$(pgrep -f "$proc" 2>/dev/null || true)
            echo "$pids" | while read -r pid; do
                echo "    PID: $pid"
            done
            
            safe_kill "$proc" "TERM"
            sleep 1
            
            if pgrep -f "$proc" > /dev/null 2>&1; then
                print_warning "Force killing..."
                safe_kill "$proc" "9"
            fi
            ((killed++))
        fi
    done
    
    print_success "Killed $killed process(es)"
    echo ""
}

free_ports() {
    print_step "[2/8] Freeing ports..."
    
    for port in "${PORTS[@]}"; do
        local pids=$(sudo lsof -t -i ":$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            print_info "Freeing port $port"
            echo "$pids" | while read -r pid; do
                echo "    PID: $pid"
                sudo kill -9 "$pid" 2>/dev/null || true
            done
        fi
    done
    
    print_success "Ports freed"
    echo ""
}

remove_rpm_packages() {
    print_step "[3/8] Removing RPM packages..."
    
    if command -v rpm &> /dev/null; then
        local installed_pkgs=$(rpm -qa 2>/dev/null | grep -i "social.*tribe" || true)
        if [ -n "$installed_pkgs" ]; then
            echo "$installed_pkgs" | while read -r pkg; do
                print_info "Removing: $pkg"
                sudo rpm -e --nodeps "$pkg" 2>/dev/null || true
            done
        fi
    fi
    
    if command -v dnf &> /dev/null; then
        sudo dnf remove -y "*social*tribe*" 2>/dev/null || true
    fi
    
    print_success "Packages removed"
    echo ""
}

remove_binaries() {
    print_step "[4/8] Removing binaries and libraries..."
    local removed=0
    
    for bin_path in "${BINARY_PATHS[@]}"; do
        for bin_name in "${BINARY_NAMES[@]}"; do
            local full_path="$bin_path/$bin_name"
            if [ -f "$full_path" ] || [ -L "$full_path" ]; then
                print_info "Removing: $full_path"
                sudo rm -f "$full_path" 2>/dev/null || true
                ((removed++))
            fi
        done
    done
    
    for lib_dir in "${LIB_DIRS[@]}"; do
        if [ -d "$lib_dir" ]; then
            print_info "Removing: $lib_dir"
            sudo rm -rf "$lib_dir" 2>/dev/null || true
            ((removed++))
        fi
    done
    
    print_success "Removed $removed binary/library item(s)"
    echo ""
}

remove_desktop_files() {
    print_step "[5/8] Removing desktop entries and icons..."
    local removed=0
    
    for path in "${DESKTOP_PATHS[@]}"; do
        for name in "${DESKTOP_NAMES[@]}"; do
            local desktop_file="$path/$name.desktop"
            if [ -f "$desktop_file" ]; then
                print_info "Removing: $desktop_file"
                rm -f "$desktop_file" 2>/dev/null || sudo rm -f "$desktop_file" 2>/dev/null || true
                ((removed++))
            fi
        done
    done
    
    for dir in "${ICON_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            for name in "${ICON_NAMES[@]}"; do
                local found_icons=$(find "$dir" -name "*$name*" -type f 2>/dev/null || true)
                if [ -n "$found_icons" ]; then
                    echo "$found_icons" | while read -r icon; do
                        print_info "Removing: $icon"
                        rm -f "$icon" 2>/dev/null || sudo rm -f "$icon" 2>/dev/null || true
                    done
                    ((removed++))
                fi
            done
        fi
    done
    
    sudo update-desktop-database 2>/dev/null || true
    update-desktop-database ~/.local/share/applications/ 2>/dev/null || true
    sudo gtk-update-icon-cache /usr/share/icons/hicolor/ 2>/dev/null || true
    
    print_success "Removed $removed desktop/icon item(s)"
    echo ""
}

remove_data() {
    print_step "[6/8] Removing application data..."
    local removed=0
    
    for dir in "${DATA_DIRS[@]}"; do
        if [ -e "$dir" ]; then
            print_info "Removing: $dir"
            rm -rf "$dir" 2>/dev/null || sudo rm -rf "$dir" 2>/dev/null || true
            ((removed++))
        fi
    done
    
    local nuitka_tmp=$(find /tmp -maxdepth 1 -type d -name "onefile_*" -user "$USER" 2>/dev/null || true)
    if [ -n "$nuitka_tmp" ]; then
        print_info "Removing Nuitka temp files..."
        echo "$nuitka_tmp" | while read -r tmpdir; do
            echo "    $tmpdir"
            rm -rf "$tmpdir" 2>/dev/null || true
        done
        ((removed++))
    fi
    
    print_success "Removed $removed data item(s)"
    echo ""
}

clean_systemd_services() {
    print_step "[7/8] Cleaning systemd services..."
    local removed=0
    
    for svc in "${SYSTEMD_SERVICES[@]}"; do
        for scope in "system" "user"; do
            local unit_files=""
            if [ "$scope" = "user" ]; then
                unit_files=$(systemctl --user list-unit-files --all 2>/dev/null | grep -i "$svc" || true)
            else
                unit_files=$(systemctl list-unit-files --all 2>/dev/null | grep -i "$svc" || true)
            fi
            
            if [ -n "$unit_files" ]; then
                print_info "Stopping $scope service: $svc"
                if [ "$scope" = "user" ]; then
                    systemctl --user stop "$svc" 2>/dev/null || true
                    systemctl --user disable "$svc" 2>/dev/null || true
                else
                    sudo systemctl stop "$svc" 2>/dev/null || true
                    sudo systemctl disable "$svc" 2>/dev/null || true
                fi
                ((removed++))
            fi
        done
        
        local service_paths=(
            "/etc/systemd/system/$svc"
            "/etc/systemd/system/$svc.service"
            "$HOME/.config/systemd/user/$svc"
            "$HOME/.config/systemd/user/$svc.service"
        )
        
        for svc_path in "${service_paths[@]}"; do
            if [ -f "$svc_path" ]; then
                print_info "Removing: $svc_path"
                sudo rm -f "$svc_path" 2>/dev/null || rm -f "$svc_path" 2>/dev/null || true
            fi
        done
    done
    
    sudo systemctl daemon-reload 2>/dev/null || true
    systemctl --user daemon-reload 2>/dev/null || true
    
    print_success "Cleaned $removed service(s)"
    echo ""
}

clean_package_cache() {
    print_step "[8/8] Cleaning package cache..."
    
    if command -v dnf &> /dev/null; then
        sudo dnf clean packages --disablerepo="*" --enablerepo="@commandline" 2>/dev/null || true
        sudo dnf makecache 2>/dev/null || true
    fi
    
    print_success "Package cache cleaned"
    echo ""
}

verify_removal() {
    print_header "Verification"
    
    local remaining_procs=$(ps aux | grep -iE "social.tribe|tribe.backend|tribe.database|benchmark.server" | grep -v grep | wc -l)
    local remaining_bins=$(find /usr/bin /usr/local/bin \( -name "*tribe*" -o -name "*social*" -o -name "*benchmark*" \) 2>/dev/null | grep -v "cargo" | wc -l)
    local remaining_desktop=$(find /usr/share/applications "$HOME/.local/share/applications" \( -name "*tribe*" -o -name "*social*" \) 2>/dev/null | wc -l)
    local remaining_data=$(find "$HOME/.local/share" "$HOME/.config" "$HOME/.cache" -maxdepth 2 \( -name "*SocialTribe*" -o -name "*social-tribe*" \) 2>/dev/null | wc -l)
    
    echo -e "${YELLOW}📋 Summary:${NC}"
    echo -e "  Processes running: ${RED}$remaining_procs${NC}"
    echo -e "  Binary files remaining: ${RED}$remaining_bins${NC}"
    echo -e "  Desktop files remaining: ${RED}$remaining_desktop${NC}"
    echo -e "  Data files remaining: ${RED}$remaining_data${NC}"
    echo ""
    
    if [ "$remaining_procs" -eq 0 ] && [ "$remaining_bins" -eq 0 ] && [ "$remaining_desktop" -eq 0 ] && [ "$remaining_data" -eq 0 ]; then
        echo -e "${GREEN}🎉 All traces removed successfully!${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Some items remain. You may need to remove them manually.${NC}"
        
        if [ "$remaining_bins" -gt 0 ]; then
            echo ""
            echo -e "${YELLOW}Remaining binaries:${NC}"
            find /usr/bin /usr/local/bin \( -name "*tribe*" -o -name "*social*" -o -name "*benchmark*" \) 2>/dev/null | grep -v "cargo"
        fi
        
        if [ "$remaining_data" -gt 0 ]; then
            echo ""
            echo -e "${YELLOW}Remaining data files:${NC}"
            find "$HOME/.local/share" "$HOME/.config" "$HOME/.cache" -maxdepth 2 \( -name "*SocialTribe*" -o -name "*social-tribe*" \) 2>/dev/null
        fi
        return 1
    fi
}

ask_restart_gnome() {
    echo ""
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
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    require_sudo
    print_header "🧹 Social Tribe - Complete Uninstall"
    echo ""
    
    kill_processes
    free_ports
    remove_rpm_packages
    remove_binaries
    remove_desktop_files
    remove_data
    clean_systemd_services
    clean_package_cache
    
    print_header "✅ Uninstall Complete!"
    echo ""
    
    verify_removal
    echo ""
    echo -e "${GREEN}✅ Ready for fresh installation!${NC}"
    
    ask_restart_gnome
    echo ""
    echo -e "${YELLOW}💡 Tip: After uninstall, reboot or logout/login for complete cleanup.${NC}"
    
    exit 0
}

main "$@"
