import os
import sys
from pathlib import Path


class AppPaths:
    APP_NAME = "SocialTribe"

    @classmethod
    def get_base_path(cls) -> Path:
        """
        Return a writable base directory for application runtime data.

        Development:
            Directory containing the launched script.

        Windows production:
            %LOCALAPPDATA%/SocialTribe

        macOS production:
            ~/Library/Application Support/SocialTribe

        Linux production:
            $XDG_DATA_HOME/SocialTribe
            fallback: ~/.local/share/SocialTribe
        """

        # Use the project directory during development builds.

        if not getattr(sys, "frozen", False):
            return Path(sys.argv[0]).resolve().parent

        # Windows
        if sys.platform == "win32":
            local_app_data = os.environ.get("LOCALAPPDATA")

            if local_app_data:
                base = Path(local_app_data) / cls.APP_NAME
            else:
                base = (
                    Path.home()
                    / "AppData"
                    / "Local"
                    / cls.APP_NAME
                )

        # macOS
        elif sys.platform == "darwin":
            base = (
                Path.home()
                / "Library"
                / "Application Support"
                / cls.APP_NAME
            )

        # Linux / Unix
        else:
            xdg_data_home = os.environ.get("XDG_DATA_HOME")

            if xdg_data_home:
                base = Path(xdg_data_home) / cls.APP_NAME
            else:
                base = (
                    Path.home()
                    / ".local"
                    / "share"
                    / cls.APP_NAME
                )

        # Ensure the application data directory exists before use.

        base.mkdir(
            parents=True,
            exist_ok=True,
        )

        return base

    @classmethod
    def get_logs_dir(cls) -> Path:

        # Create a dedicated directory for application log files.

        path = cls.get_base_path() / "logs"
        path.mkdir(
            parents=True,
            exist_ok=True,
        )
        return path