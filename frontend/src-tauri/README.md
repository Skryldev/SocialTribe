# تنظیم متغیرهای محیطی
export APPIMAGE_EXTRACT_AND_RUN=1
export NO_STRIP=1

## حالا بیلد بگیرید
cd /home/askari/Alireza/Bun/typescript-app/src-tauri
cargo tauri build

# نصب RPM or DEB
cd /home/askari/Alireza/Bun/typescript-app/src-tauri/target/release/bundle/rpm
sudo dnf install ./"Social Tribe-1.0.0-1.x86_64.rpm"
cd /home/askari/Alireza/Bun/typescript-app/src-tauri/target/release/bundle/deb
sudo dnf install ./"Social Tribe_1.0.0_amd64.deb"

# نصب با AppImage
cd /home/askari/Alireza/Bun/typescript-app/src-tauri/target/release/bundle/appimage
chmod +x "Social Tribe_1.0.0_amd64.AppImage"
./"Social Tribe_1.0.0_amd64.AppImage"

## اجرای برنامه در ترمینال
social-tribe