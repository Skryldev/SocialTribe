import os
import json
import socket
import logging
import logging.config
import logging.handlers
from functools import lru_cache
from datetime import datetime
from pathlib import Path
from typing import Optional

from core.websocket_log_handler import WebSocketLogHandler
from utils.app_paths import AppPaths


# ============================================================
# [1] Configuration
# ============================================================

# Using environment variable for log path
LOGS_ROOT_ENV = os.getenv("LOGS_ROOT", "")
if LOGS_ROOT_ENV:
    LOGS_ROOT = Path(LOGS_ROOT_ENV)
else:
    LOGS_ROOT = AppPaths.get_base_path() / "logs"

# Ensure that the directory exists with full access
try:
    LOGS_ROOT.mkdir(parents=True, exist_ok=True)
except OSError:
    LOGS_ROOT = Path("/tmp/logs")
    LOGS_ROOT.mkdir(parents=True, exist_ok=True)

ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()
LOG_OUTPUT = os.getenv("LOG_OUTPUT", "file")


# ============================================================
# [2] JSON Formatter
# ============================================================

class JsonFormatter(logging.Formatter):
    """Production-grade JSON formatter for structured logging"""

    HOSTNAME = socket.gethostname()
    ENVIRONMENT = os.getenv("ENVIRONMENT", "production")

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now().astimezone().isoformat()

        log_record = {
            "level": record.levelname.lower(),
            "timestamp": timestamp,
            "caller": f"{record.pathname}:{record.lineno}",
            "message": record.getMessage(),
            "environment": self.ENVIRONMENT,
            "hostname": self.HOSTNAME,
            "module": record.module,
            "logger": record.name,
            "pid": os.getpid(),
        }

        if hasattr(record, "extra_data"):
            log_record.update(record.extra_data)

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        if record.levelno >= logging.ERROR and not record.exc_info:
            log_record["stacktrace"] = self.format_stack()

        return json.dumps(
            log_record,
            ensure_ascii=False,
            separators=(",", ":"),
        )


# ============================================================
# [3] Logger Configuration
# ============================================================

@lru_cache(maxsize=1)
def _get_log_file() -> Path:
    """Get log file path with caching"""
    log_dir = LOGS_ROOT / "main"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir / "app.jsonl"


@lru_cache(maxsize=1)
def setup_logging() -> None:
    """Setup logging configuration"""

    # Create log's directories
    for subdir in ["main", "storage", "benchmark", "access"]:
        folder = LOGS_ROOT / subdir
        try:
            folder.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass

    log_file = _get_log_file()

    # ============================================================
    # [4] Logging Configuration
    # ============================================================

    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "console": {
                "format": "%(asctime)s | %(levelname)-8s | %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": JsonFormatter,
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": LOG_LEVEL,
                "formatter": "console",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": LOG_LEVEL,
            "handlers": ["console"],
        },
        "loggers": {
            "server": {"level": LOG_LEVEL, "propagate": True},
            "uvicorn": {"level": "INFO", "propagate": True},
            "uvicorn.access": {"level": "INFO", "propagate": False},
            "uvicorn.error": {"level": "INFO", "propagate": True},
            "asyncio": {"level": "INFO", "propagate": True},
            "grpc": {"level": "INFO", "propagate": True},
            "websockets": {"level": "INFO", "propagate": True},
            "watchfiles": {"level": "WARNING", "propagate": False},
            "urllib3": {"level": "INFO", "propagate": True},
            "httpx": {"level": "INFO", "propagate": True},
            "multipart": {"level": "INFO", "propagate": True},
            "fastapi": {"level": "INFO", "propagate": True},
            "pydantic": {"level": "WARNING", "propagate": True},
        },
    }

    # Add file handler if needed
    if LOG_OUTPUT in ["file", "both"]:
        config["handlers"]["jsonl"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "filename": str(log_file),
            "maxBytes": 10_485_760,  # 10MB
            "backupCount": 30,
            "encoding": "utf-8",
            "formatter": "json",
        }
        config["root"]["handlers"].append("jsonl")

    logging.config.dictConfig(config)

    # ============================================================
    # [5] WebSocket Handler
    # ============================================================

    root_logger = logging.getLogger()

    has_ws_handler = any(
        isinstance(h, WebSocketLogHandler)
        for h in root_logger.handlers
    )

    if not has_ws_handler:
        try:
            ws_handler = WebSocketLogHandler()
            ws_handler.setLevel(LOG_LEVEL)
            root_logger.addHandler(ws_handler)
        except Exception as e:
            logging.warning(f"Failed to add WebSocket handler: {e}")

    # ============================================================
    # [6] Initialization Log
    # ============================================================

    logger = logging.getLogger("main")
    logger.info(
        "Logging initialized successfully",
        extra={
            "extra_data": {
                "path": str(log_file),
                "level": LOG_LEVEL,
                "environment": ENVIRONMENT,
                "output": LOG_OUTPUT,
            }
        }
    )


# ============================================================
# [7] Logger Factory
# ============================================================

def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance

    Args:
        name: Logger name (optional, uses caller module name)

    Returns:
        logging.Logger instance
    """
    if name is None:
        import inspect
        frame = inspect.currentframe().f_back
        name = frame.f_globals.get("__name__", "root")

    logger = logging.getLogger(name)

    if name.startswith("uvicorn"):
        logger.propagate = True
    elif name.startswith("asyncio"):
        logger.propagate = True
    else:
        logger.propagate = True

    return logger


# ============================================================
# [8] Additional Utilities
# ============================================================

class LogContext:
    """Context manager for adding extra data to logs"""

    def __init__(self, **kwargs):
        self.extra = kwargs
        self.old_extra = None

    def __enter__(self):
        logger = logging.getLogger()
        self.old_extra = getattr(logger, "extra_data", {})
        logger.extra_data = {**self.old_extra, **self.extra}
        return self

    def __exit__(self, *args):
        logger = logging.getLogger()
        logger.extra_data = self.old_extra


def log_with_context(logger: logging.Logger, level: str, msg: str, **kwargs) -> None:
    """Log a message with extra context"""
    if not hasattr(logger, "extra_data"):
        logger.extra_data = {}

    original_extra = logger.extra_data.copy()
    logger.extra_data.update(kwargs)

    getattr(logger, level.lower())(msg)

    logger.extra_data = original_extra


# ============================================================
# [9] Initial Setup
# ============================================================

# Automatically start logging on import
setup_logging()
