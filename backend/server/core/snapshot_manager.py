import os
import hashlib
import json
import shutil
import uuid
from copy import deepcopy
from datetime import datetime, UTC
from pathlib import Path
from threading import RLock
from typing import Optional, Dict, Any, List, Set

from logger_config import get_logger
from core.exceptions import LayoutError
from utils.app_paths import AppPaths


logger = get_logger(__name__)

# ============================================================
# [1] Configuration
# ============================================================

# Use environment variable for snapshot path
SNAPSHOT_ROOT_ENV = os.getenv("SNAPSHOT_ROOT", "")

if SNAPSHOT_ROOT_ENV:
    SNAPSHOT_ROOT = Path(SNAPSHOT_ROOT_ENV)
else:
    BASE_DIR = AppPaths.get_base_path()
    SNAPSHOT_ROOT = BASE_DIR / "snapshots"

# Ensure that the directory exists with full access

try:
    SNAPSHOT_ROOT.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Snapshot root initialized",
        extra={"extra_data": {"path": str(SNAPSHOT_ROOT)}}
    )
except OSError as e:
    logger.error(
        f"Failed to create snapshot root: {e}",
        extra={"extra_data": {"path": str(SNAPSHOT_ROOT)}}
    )
    # Fallback to /tmp
    SNAPSHOT_ROOT = Path("/tmp/snapshots")
    SNAPSHOT_ROOT.mkdir(parents=True, exist_ok=True)
    logger.warning(
        f"Using fallback snapshot root: {SNAPSHOT_ROOT}"
    )


# ============================================================
# [2] SnapshotManager Class
# ============================================================

class SnapshotManager:
    """
    Production-grade snapshot manager with thread safety.
    Manages layout snapshots for graph algorithms with support for:
    - Preset and custom parameters
    - Child snapshots (incremental updates)
    - Graph synchronization
    - Cleanup and deletion
    """

    def __init__(self):
        self._lock = RLock()
        self._validate_snapshot_root()

    def _validate_snapshot_root(self) -> None:
        """Validate that snapshot root is writable"""
        test_file = SNAPSHOT_ROOT / ".write_test"
        try:
            test_file.touch()
            test_file.unlink()
        except (OSError, PermissionError) as e:
            logger.error(
                f"Snapshot root is not writable: {e}",
                extra={"extra_data": {"path": str(SNAPSHOT_ROOT)}}
            )
            raise LayoutError(
                "Snapshot root is not writable",
                details={"path": str(SNAPSHOT_ROOT), "error": str(e)}
            )

    # ============================================================
    # [3] Helper Methods
    # ============================================================

    def _params_hash(self, params: Optional[Dict]) -> str:
        """Generate stable hash for custom layout parameters"""
        params = params or {}
        raw = json.dumps(params, sort_keys=True, ensure_ascii=False)
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]

    def _is_preset(self, params: Optional[Dict]) -> bool:
        """Check if params is empty (preset)"""
        return not params or len(params) == 0

    def _ensure_dir(self, path: Path) -> Path:
        """Create directory with error handling"""
        try:
            path.mkdir(parents=True, exist_ok=True)
            return path
        except OSError as e:
            logger.error(
                f"Failed to create directory: {e}",
                extra={"extra_data": {"path": str(path)}}
            )
            raise LayoutError(
                "Failed to create directory",
                details={"path": str(path), "error": str(e)}
            )

    def _graph_dir(self, graph_id: str) -> Path:
        """Get graph directory"""
        path = SNAPSHOT_ROOT / graph_id
        return self._ensure_dir(path)

    def _algorithm_dir(self, graph_id: str, algorithm: str) -> Path:
        """Get algorithm directory"""
        path = self._graph_dir(graph_id) / algorithm
        return self._ensure_dir(path)

    def _layout_dir(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> Path:
        """Get layout directory for specific params"""
        algorithm_dir = self._algorithm_dir(graph_id, algorithm)

        if self._is_preset(params):
            path = algorithm_dir / "preset"
        else:
            path = algorithm_dir / "custom" / self._params_hash(params)

        return self._ensure_dir(path)

    def _layout_file(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> Path:
        """Get layout metadata file path"""
        return self._layout_dir(graph_id, algorithm, params) / "layout.json"

    def _snapshot_file(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict],
        snapshot_id: str
    ) -> Path:
        """Get snapshot file path"""
        return self._layout_dir(graph_id, algorithm, params) / f"{snapshot_id}.json"

    def _read_json(self, path: Path) -> Optional[Dict]:
        """Read JSON file with error handling"""
        if not path.exists():
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.error(
                f"Failed to read JSON: {e}",
                extra={"extra_data": {"path": str(path)}}
            )
            raise LayoutError(
                "Cannot read snapshot",
                details={"reason": str(e), "path": str(path)}
            )

    def _write_json(self, path: Path, data: Dict) -> None:
        """Write JSON file with error handling"""
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except OSError as e:
            logger.error(
                f"Failed to write JSON: {e}",
                extra={"extra_data": {"path": str(path)}}
            )
            raise LayoutError(
                "Cannot write snapshot",
                details={"reason": str(e), "path": str(path)}
            )

    def _delete_path(self, path: Path) -> None:
        """Delete path (file or directory) with error handling"""
        try:
            if path.is_file():
                path.unlink(missing_ok=True)
            elif path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
        except OSError as e:
            logger.warning(
                f"Failed to delete path: {e}",
                extra={"extra_data": {"path": str(path)}}
            )

    def _new_layout_metadata(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict],
        snapshot_id: str
    ) -> Dict:
        """Create new layout metadata"""
        now = datetime.now(UTC).isoformat()
        return {
            "graph_id": graph_id,
            "algorithm": algorithm,
            "mode": "preset" if self._is_preset(params) else "custom",
            "params": params or {},
            "layout_snapshot_id": snapshot_id,
            "active_snapshot_id": snapshot_id,
            "graph_changed": False,
            "created_at": now,
            "updated_at": now,
        }

    def _load_layout(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Load layout metadata"""
        return self._read_json(self._layout_file(graph_id, algorithm, params))

    def _save_layout(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict],
        layout: Dict
    ) -> None:
        """Save layout metadata"""
        layout["updated_at"] = datetime.now(UTC).isoformat()
        self._write_json(self._layout_file(graph_id, algorithm, params), layout)

    # ============================================================
    # [4] Public Methods - Snapshot Creation
    # ============================================================

    def create_layout_snapshot(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict],
        positions: Dict
    ) -> Dict:
        """Create initial layout snapshot"""
        with self._lock:
            snapshot_id = "snapshot_001"

            layout = self._new_layout_metadata(
                graph_id, algorithm, params, snapshot_id
            )
            self._save_layout(graph_id, algorithm, params, layout)

            snapshot = {
                "snapshot_id": snapshot_id,
                "type": "layout",
                "parent": None,
                "created_at": datetime.now(UTC).isoformat(),
                "positions": positions,
            }

            self._write_json(
                self._snapshot_file(graph_id, algorithm, params, snapshot_id),
                snapshot
            )

            logger.info(
                "Created layout snapshot",
                extra={
                    "extra_data": {
                        "graph_id": graph_id,
                        "algorithm": algorithm,
                        "snapshot_id": snapshot_id,
                    }
                }
            )

            return snapshot

    def create_child_snapshot(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict],
        positions: Dict,
        snapshot_type: str = "update-node"
    ) -> Dict:
        """Create child snapshot (incremental update)"""
        with self._lock:
            layout = self._load_layout(graph_id, algorithm, params)
            if not layout:
                raise LayoutError("Layout snapshot not found")

            parent = layout["active_snapshot_id"]
            snapshot_id = f"snapshot_{uuid.uuid4().hex[:8]}"

            snapshot = {
                "snapshot_id": snapshot_id,
                "type": snapshot_type,
                "parent": parent,
                "created_at": datetime.now(UTC).isoformat(),
                "positions": positions,
            }

            self._write_json(
                self._snapshot_file(graph_id, algorithm, params, snapshot_id),
                snapshot
            )

            layout["active_snapshot_id"] = snapshot_id
            self._save_layout(graph_id, algorithm, params, layout)

            logger.info(
                "Created child snapshot",
                extra={
                    "extra_data": {
                        "graph_id": graph_id,
                        "algorithm": algorithm,
                        "snapshot_id": snapshot_id,
                        "parent_snapshot": parent,
                    }
                }
            )

            return snapshot

    # ============================================================
    # [5] Public Methods - Snapshot Retrieval
    # ============================================================

    def get_active_snapshot(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Get active snapshot"""
        layout = self._load_layout(graph_id, algorithm, params)
        if not layout:
            return None

        snapshot_id = layout.get("active_snapshot_id")
        if not snapshot_id:
            return None

        return self._read_json(
            self._snapshot_file(graph_id, algorithm, params, snapshot_id)
        )

    def get_layout_snapshot(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Get layout snapshot"""
        layout = self._load_layout(graph_id, algorithm, params)
        if not layout:
            return None

        snapshot_id = layout.get("layout_snapshot_id")
        if not snapshot_id:
            return None

        return self._read_json(
            self._snapshot_file(graph_id, algorithm, params, snapshot_id)
        )

    def get_active_positions(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Get active positions"""
        snapshot = self.get_active_snapshot(graph_id, algorithm, params)
        if not snapshot:
            return None
        return snapshot.get("positions")

    def exists(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> bool:
        """Check if layout exists"""
        return self._layout_file(graph_id, algorithm, params).exists()

    # ============================================================
    # [6] Public Methods - Graph State
    # ============================================================

    def graph_changed(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> bool:
        """Check if graph has changed"""
        layout = self._load_layout(graph_id, algorithm, params)
        if not layout:
            return True
        return layout.get("graph_changed", False)

    def set_graph_changed(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None,
        changed: bool = True
    ) -> None:
        """Set graph_changed flag"""
        layout = self._load_layout(graph_id, algorithm, params)
        if not layout:
            return

        layout["graph_changed"] = changed
        self._save_layout(graph_id, algorithm, params, layout)

    # ============================================================
    # [7] Public Methods - Reset
    # ============================================================

    def reset_to_layout_snapshot(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> None:
        """Reset to layout snapshot"""
        with self._lock:
            layout = self._load_layout(graph_id, algorithm, params)
            if not layout:
                return

            keep = layout.get("layout_snapshot_id")
            if not keep:
                return

            layout_dir = self._layout_dir(graph_id, algorithm, params)

            for file in layout_dir.glob("snapshot_*.json"):
                if file.stem != keep:
                    try:
                        file.unlink(missing_ok=True)
                    except OSError:
                        pass

            layout["active_snapshot_id"] = keep
            layout["graph_changed"] = False
            self._save_layout(graph_id, algorithm, params, layout)

    # ============================================================
    # [8] Public Methods - Delete
    # ============================================================

    def delete_layout(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict] = None
    ) -> None:
        """Delete layout"""
        logger.info(
            "Deleted layout cache",
            extra={
                "extra_data": {
                    "graph_id": graph_id,
                    "algorithm": algorithm,
                }
            }
        )
        self._delete_path(self._layout_dir(graph_id, algorithm, params))

    def delete_algorithm(
        self,
        graph_id: str,
        algorithm: str
    ) -> None:
        """Delete all layouts for an algorithm"""
        self._delete_path(self._algorithm_dir(graph_id, algorithm))

    def clear_graph(self, graph_id: str) -> None:
        """Clear all graph snapshots"""
        logger.info(
            "Cleared all graph snapshots",
            extra={"extra_data": {"graph_id": graph_id}}
        )
        self._delete_path(self._graph_dir(graph_id))

    def delete_preset(
        self,
        graph_id: str,
        algorithm: str
    ) -> None:
        """Delete preset layout"""
        self._delete_path(
            self._algorithm_dir(graph_id, algorithm) / "preset"
        )

    def delete_custom(
        self,
        graph_id: str,
        algorithm: str
    ) -> None:
        """Delete custom layouts"""
        self._delete_path(
            self._algorithm_dir(graph_id, algorithm) / "custom"
        )

    # ============================================================
    # [9] Public Methods - Synchronization
    # ============================================================

    def synchronize_positions_with_graph(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict],
        repository
    ) -> Optional[Dict]:
        """
        Synchronize active snapshot positions with current graph
        after add/delete node operations.
        """
        active = self.get_active_snapshot(graph_id, algorithm, params)
        if active is None:
            return None

        positions = deepcopy(active.get("positions", {}))
        nodes = repository.get_nodes(graph_id)

        current_ids = {node.id for node in nodes}

        # Remove deleted nodes
        for node_id in list(positions.keys()):
            if node_id not in current_ids:
                positions.pop(node_id, None)

        # Add new nodes
        for node in nodes:
            if node.id not in positions:
                positions[node.id] = {
                    "x": node.position.x,
                    "y": node.position.y,
                }

        return positions

    def preserve_active_snapshot_after_graph_change(
        self,
        graph_id: str,
        algorithm: str,
        params: Optional[Dict],
        repository
    ) -> None:
        """
        Preserve the current active snapshot for the active layout while
        invalidating every cached layout of this graph.

        After this operation:
            - all previous layouts are removed
            - current layout is recreated
            - active snapshot becomes snapshot_001
            - graph_changed=True
        """
        with self._lock:
            active = self.get_active_snapshot(graph_id, algorithm, params)
            if active is None:
                return

            positions = self.synchronize_positions_with_graph(
                graph_id, algorithm, params, repository
            )

            if positions is None:
                return

            # Clear all snapshots for this graph
            self.clear_graph(graph_id)

            # Create new layout snapshot with synchronized positions
            self.create_layout_snapshot(
                graph_id=graph_id,
                algorithm=algorithm,
                params=params,
                positions=positions,
            )

            # Mark graph as changed
            layout = self._load_layout(graph_id, algorithm, params)
            if layout:
                layout["layout_snapshot_id"] = None
                layout["graph_changed"] = True
                self._save_layout(graph_id, algorithm, params, layout)

    # ============================================================
    # [10] Public Methods - Cleanup
    # ============================================================

    def cleanup_orphaned_snapshots(self) -> int:
        """
        Remove orphaned snapshot files that don't have corresponding layout metadata.
        Returns number of removed files.
        """
        removed = 0
        with self._lock:
            # Iterate through all graph directories
            for graph_path in SNAPSHOT_ROOT.iterdir():
                if not graph_path.is_dir():
                    continue

                # Iterate through algorithm directories
                for algo_path in graph_path.iterdir():
                    if not algo_path.is_dir():
                        continue

                    # Check preset and custom directories
                    for layout_type in ["preset", "custom"]:
                        layout_type_path = algo_path / layout_type
                        if not layout_type_path.exists():
                            continue

                        # If custom, iterate through hash directories
                        if layout_type == "custom":
                            for hash_path in layout_type_path.iterdir():
                                if not hash_path.is_dir():
                                    continue
                                removed += self._cleanup_snapshots_in_dir(hash_path)
                        else:
                            removed += self._cleanup_snapshots_in_dir(layout_type_path)

        logger.info(
            f"Cleaned up {removed} orphaned snapshots",
            extra={"extra_data": {"removed_count": removed}}
        )
        return removed

    def _cleanup_snapshots_in_dir(self, dir_path: Path) -> int:
        """Clean up snapshots in a specific directory"""
        removed = 0
        layout_file = dir_path / "layout.json"

        # If no layout file exists, remove all snapshots
        if not layout_file.exists():
            for file in dir_path.glob("snapshot_*.json"):
                try:
                    file.unlink()
                    removed += 1
                except OSError:
                    pass
            return removed

        # Load layout to get valid snapshot IDs
        layout = self._read_json(layout_file)
        if not layout:
            return removed

        valid_ids = set()
        if layout.get("active_snapshot_id"):
            valid_ids.add(layout["active_snapshot_id"])
        if layout.get("layout_snapshot_id"):
            valid_ids.add(layout["layout_snapshot_id"])

        # Remove snapshots not in valid IDs
        for file in dir_path.glob("snapshot_*.json"):
            snapshot_id = file.stem
            if snapshot_id not in valid_ids:
                try:
                    file.unlink()
                    removed += 1
                except OSError:
                    pass

        return removed

    def get_stats(self) -> Dict[str, Any]:
        """Get snapshot statistics"""
        total_graphs = 0
        total_algorithms = 0
        total_snapshots = 0
        total_size = 0

        for graph_path in SNAPSHOT_ROOT.iterdir():
            if not graph_path.is_dir():
                continue
            total_graphs += 1

            for algo_path in graph_path.iterdir():
                if not algo_path.is_dir():
                    continue
                total_algorithms += 1

                for file in algo_path.rglob("*.json"):
                    total_snapshots += 1
                    total_size += file.stat().st_size

        return {
            "root_path": str(SNAPSHOT_ROOT),
            "total_graphs": total_graphs,
            "total_algorithms": total_algorithms,
            "total_snapshots": total_snapshots,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
        }
