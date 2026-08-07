# Tauri Application Build & Deployment Guide

## Environment Configuration

Before initiating the build process, ensure the following environment variables are properly configured:

```bash
# Tauri build optimization flags
export APPIMAGE_EXTRACT_AND_RUN=1    # Enables AppImage extraction for better compatibility
export NO_STRIP=1                     # Preserves debug symbols for development builds
```

## Build Process

### TypeScript Application Build
Navigate to your Tauri project directory and initiate the build:

```bash
cd /home/askari/Alireza/Bun/typescript-app/src-tauri
cargo tauri build
```

### SocialTribe Application Build
For the SocialTribe project, execute the build from its respective directory:

```bash
cd /home/askari/Alireza/Python/SocialTribe/frontend/src-tauri
cargo tauri build
```

## Package Installation

### RPM Package Installation (Fedora/RHEL Based Systems)
```bash
# Navigate to RPM build directory
cd /home/askari/Alireza/Python/SocialTribe/frontend/src-tauri/target/release/bundle/rpm

# Install using DNF package manager
sudo dnf install ./"Social Tribe-2.17.3-1.x86_64.rpm"
```

### DEB Package Installation (Debian/Ubuntu Based Systems)
```bash
# Navigate to DEB build directory
cd /home/askari/Alireza/Python/SocialTribe/frontend/src-tauri/target/release/bundle/deb

# Install using DNF (cross-platform compatibility)
sudo dnf install ./"Social Tribe_2.17.3_amd64.deb"
```

> **Note:** For Debian-based systems, use `sudo dpkg -i` or `sudo apt install ./filename.deb` instead of DNF.

### AppImage Execution
AppImages provide a portable, distribution-agnostic deployment method:

```bash
# Navigate to AppImage directory
cd /home/askari/Alireza/Bun/typescript-app/src-tauri/target/release/bundle/appimage

# Make executable
chmod +x "Social Tribe_1.0.0_amd64.AppImage"

# Execute the application
./"Social Tribe_1.0.0_amd64.AppImage"
```

## Running the Application

### Terminal Execution
After installation, launch the application from the terminal:

```bash
# Launch SocialTribe application
social-tribe
```

## Troubleshooting Common Issues

### Build Failures
- **Cargo dependencies**: Ensure all Rust dependencies are properly cached: `cargo update`
- **Tauri prerequisites**: Verify system dependencies are installed per Tauri documentation
- **Permissions**: Ensure write permissions in build directories

### Installation Issues
- **Package conflicts**: Use `--skip-broken` with DNF if encountering dependency conflicts
- **AppImage permissions**: Always set executable bit with `chmod +x` before execution
- **Missing libraries**: Install required system libraries based on error messages

## Production Considerations

### Build Optimization
For production builds, consider:
```bash
# Enable optimizations
export RUSTFLAGS="-C opt-level=3"
export TARGET_TRIPLE="x86_64-unknown-linux-gnu"
```

### Signing and Notarization
For distribution, implement code signing:
```bash
# Example signing configuration
export TAURI_SIGNING_PRIVATE_KEY="your_private_key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your_password"
```

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintainer:** Development Team
