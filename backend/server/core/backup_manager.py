import os
import json
import gzip
import re
from datetime import datetime, UTC
from pathlib import Path
from typing import Optional, List, Dict, Any
from uuid import uuid4

from schemas.graph_view import GraphData
from logger_config import get_logger
from core.exceptions import BackupLoadError, BackupSaveError
from utils.app_paths import AppPaths

logger = get_logger(__name__)

# ============================================================
# [1] Configuration
# ============================================================

BASE_DIR = AppPaths.get_base_path()
BACKUP_DIR = Path(os.getenv("BACKUP_ROOT", str(BASE_DIR / "backups")))

# Ensure that the directory exists with full access
try:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Backup directory initialized",
        extra={"extra_data": {"path": str(BACKUP_DIR)}}
    )
except OSError as e:
    logger.error(
        f"Failed to create backup directory: {e}",
        extra={"extra_data": {"path": str(BACKUP_DIR)}}
    )
    # Fallback to /tmp
    BACKUP_DIR = Path("/tmp/backups")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    logger.warning(
        f"Using fallback backup directory: {BACKUP_DIR}"
    )


# ============================================================
# [2] Helper Functions
# ============================================================

def _sanitize_backup_name(name: str) -> str:
    """Sanitize backup name by removing invalid characters."""
    if not name:
        return "backup_unknown"

    name = name.strip()

    name = re.sub(r'[<>:"/\\|?*]', "_", name)

    if len(name) > 100:
        name = name[:100]
    return name or "backup_unknown"


def _get_next_backup_number() -> int:
    """Get next available backup number."""
    existing = []
    for file in BACKUP_DIR.glob("*.json.gz"):
        try:
            with gzip.open(file, "rt", encoding="utf-8") as f:
                data = json.load(f)
            name = data.get("name", "")
            if name.startswith("backup_"):
                try:
                    idx = int(name.replace("backup_", ""))
                    existing.append(idx)
                except ValueError:
                    pass
        except Exception:
            continue
    return max(existing, default=0) + 1


def _read_backup_file(file_path: Path) -> Dict[str, Any]:
    """Read and parse backup file with error handling."""
    try:
        with gzip.open(file_path, "rt", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError, gzip.BadGzipFile) as e:
        logger.error(
            f"Failed to read backup file: {e}",
            extra={"extra_data": {"path": str(file_path)}}
        )
        raise BackupLoadError(
            f"Failed to read backup file",
            details={"path": str(file_path), "error": str(e)}
        )


def _write_backup_file(file_path: Path, data: Dict[str, Any]) -> None:
    """Write backup file with error handling."""
    try:
        with gzip.open(file_path, "wt", encoding="utf-8") as f:
            json.dump(
                data,
                f,
                indent=2,
                ensure_ascii=False,
                allow_nan=False,
                default=str  # برای serialize کردن datetime و غیره
            )
    except (OSError, TypeError) as e:
        logger.error(
            f"Failed to write backup file: {e}",
            extra={"extra_data": {"path": str(file_path)}}
        )
        raise BackupSaveError(
            "Failed to write backup file",
            details={"path": str(file_path), "error": str(e)}
        )


# ============================================================
# [3] Public Functions
# ============================================================

def create_backup(graph_data: GraphData, name: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new backup of the graph data.

    Args:
        graph_data: Graph data to backup
        name: Optional backup name

    Returns:
        Dict with backup metadata

    Raises:
        BackupSaveError: If backup creation fails
    """
    try:
        backup_id = uuid4().hex[:12]

        if name:
            backup_name = _sanitize_backup_name(name)
        else:
            backup_name = f"backup_{_get_next_backup_number():03d}"

        logger.info(
            "Creating graph backup",
            extra={
                "extra_data": {
                    "backup_id": backup_id,
                    "backup_name": backup_name,
                    "graph_id": getattr(graph_data, "id", "unknown")
                }
            }
        )

        payload = {
            "backup_id": backup_id,
            "name": backup_name,
            "created_at": datetime.now(UTC).isoformat(),
            "graph": graph_data.model_dump(mode="json"),
            "version": "1.0.0",
        }

        backup_file = BACKUP_DIR / f"{backup_id}.json.gz"
        _write_backup_file(backup_file, payload)

        logger.info(
            "Backup created successfully",
            extra={
                "extra_data": {
                    "backup_id": backup_id,
                    "backup_name": backup_name,
                    "size": backup_file.stat().st_size,
                }
            }
        )

        return {
            "backup_id": backup_id,
            "name": backup_name,
            "created_at": payload["created_at"],
            "size": backup_file.stat().st_size,
        }

    except Exception as e:
        logger.exception(
            "Failed to create backup",
            extra={"extra_data": {"backup_name": name}}
        )
        raise BackupSaveError(
            "Failed to create backup",
            details={"reason": str(e), "backup_name": name}
        ) from e


def load_backup(backup_id: str) -> GraphData:
    """
    Load a backup by ID.

    Args:
        backup_id: Backup ID to load

    Returns:
        GraphData instance

    Raises:
        BackupLoadError: If backup not found or corrupted
    """
    backup_file = BACKUP_DIR / f"{backup_id}.json.gz"

    logger.info(
        "Loading backup",
        extra={"extra_data": {"backup_id": backup_id}}
    )

    if not backup_file.exists():
        logger.warning(
            "Backup file not found",
            extra={"extra_data": {"backup_id": backup_id}}
        )
        raise BackupLoadError(
            f"Backup {backup_id} not found",
            details={"backup_id": backup_id}
        )

    try:
        data = _read_backup_file(backup_file)

        if "graph" not in data:
            raise ValueError("Invalid backup format: missing 'graph' field")

        logger.info(
            "Backup loaded successfully",
            extra={
                "extra_data": {
                    "backup_id": backup_id,
                    "backup_name": data.get("name", "unknown"),
                    "created_at": data.get("created_at", "unknown"),
                }
            }
        )

        return GraphData(**data["graph"])

    except Exception as e:
        logger.exception(
            "Failed to load backup",
            extra={"extra_data": {"backup_id": backup_id}}
        )
        raise BackupLoadError(
            f"Failed to load backup {backup_id}",
            details={"backup_id": backup_id, "reason": str(e)}
        ) from e


def delete_backup(backup_id: str) -> Dict[str, Any]:
    """
    Delete a backup by ID.

    Args:
        backup_id: Backup ID to delete

    Returns:
        Dict with deletion status

    Raises:
        BackupLoadError: If backup not found
    """
    logger.info(
        "Deleting backup",
        extra={"extra_data": {"backup_id": backup_id}}
    )

    backup_file = BACKUP_DIR / f"{backup_id}.json.gz"

    if not backup_file.exists():
        logger.warning(
            "Backup not found for deletion",
            extra={"extra_data": {"backup_id": backup_id}}
        )
        raise BackupLoadError(
            f"Backup {backup_id} not found",
            details={"backup_id": backup_id}
        )

    try:

        data = _read_backup_file(backup_file)
        backup_name = data.get("name", "unknown")

        backup_file.unlink()

        logger.info(
            "Backup deleted successfully",
            extra={
                "extra_data": {
                    "backup_id": backup_id,
                    "backup_name": backup_name,
                }
            }
        )

        return {
            "deleted": True,
            "backup_id": backup_id,
            "backup_name": backup_name,
        }

    except Exception as e:
        logger.exception(
            "Failed to delete backup",
            extra={"extra_data": {"backup_id": backup_id}}
        )
        raise BackupLoadError(
            f"Failed to delete backup {backup_id}",
            details={"backup_id": backup_id, "reason": str(e)}
        ) from e


def download_backup_file(backup_id: str) -> Path:
    """
    Get the original compressed backup file path.

    Args:
        backup_id: Backup ID

    Returns:
        Path to backup file

    Raises:
        BackupLoadError: If backup not found
    """
    backup_file = BACKUP_DIR / f"{backup_id}.json.gz"

    logger.info(
        "Accessing backup file for download",
        extra={"extra_data": {"backup_id": backup_id}}
    )

    if not backup_file.exists():
        logger.warning(
            "Backup file not found for download",
            extra={"extra_data": {"backup_id": backup_id}}
        )
        raise BackupLoadError(
            f"Backup {backup_id} not found",
            details={"backup_id": backup_id}
        )

    return backup_file


def list_backups() -> List[Dict[str, Any]]:
    """
    List all available backups.

    Returns:
        List of backup metadata sorted by creation date (newest first)
    """
    result = []
    corrupted = 0

    logger.debug("Scanning backup directory")

    for file in BACKUP_DIR.glob("*.json.gz"):
        try:
            data = _read_backup_file(file)

            result.append({
                "backup_id": data.get("backup_id", file.stem),
                "name": data.get("name", "unknown"),
                "created_at": data.get("created_at", "unknown"),
                "size": file.stat().st_size,
                "version": data.get("version", "1.0.0"),
            })

        except Exception as e:
            corrupted += 1
            logger.warning(
                "Skipping corrupted backup file",
                extra={
                    "extra_data": {
                        "file": str(file),
                        "error": str(e),
                    }
                }
            )
            continue

    result.sort(
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )

    logger.info(
        "Backup listing completed",
        extra={
            "extra_data": {
                "total": len(result),
                "corrupted": corrupted,
            }
        }
    )

    return result


def get_backup_info(backup_id: str) -> Optional[Dict[str, Any]]:
    """
    Get information about a specific backup without loading the graph.

    Args:
        backup_id: Backup ID

    Returns:
        Backup metadata or None if not found
    """
    backup_file = BACKUP_DIR / f"{backup_id}.json.gz"

    if not backup_file.exists():
        return None

    try:
        data = _read_backup_file(backup_file)
        return {
            "backup_id": data.get("backup_id", backup_id),
            "name": data.get("name", "unknown"),
            "created_at": data.get("created_at", "unknown"),
            "size": backup_file.stat().st_size,
            "version": data.get("version", "1.0.0"),
        }
    except Exception as e:
        logger.warning(
            "Failed to read backup info",
            extra={
                "extra_data": {
                    "backup_id": backup_id,
                    "error": str(e),
                }
            }
        )
        return None


def cleanup_old_backups(keep_count: int = 10) -> Dict[str, Any]:
    """
    Delete old backups keeping only the most recent ones.

    Args:
        keep_count: Number of backups to keep

    Returns:
        Dict with cleanup results
    """
    backups = list_backups()

    if len(backups) <= keep_count:
        return {
            "deleted": 0,
            "kept": len(backups),
            "message": "No backups to clean"
        }

    to_delete = backups[keep_count:]
    deleted = 0

    for backup in to_delete:
        try:
            delete_backup(backup["backup_id"])
            deleted += 1
        except Exception as e:
            logger.warning(
                "Failed to delete backup during cleanup",
                extra={
                    "extra_data": {
                        "backup_id": backup["backup_id"],
                        "error": str(e),
                    }
                }
            )

    return {
        "deleted": deleted,
        "kept": len(backups) - deleted,
        "message": f"Cleaned up {deleted} old backups"
    }


def get_backup_stats() -> Dict[str, Any]:
    """
    Get statistics about backups.

    Returns:
        Dict with backup statistics
    """
    backups = list_backups()

    total_size = sum(b.get("size", 0) for b in backups)

    return {
        "total_backups": len(backups),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "oldest": backups[-1] if backups else None,
        "newest": backups[0] if backups else None,
    }
