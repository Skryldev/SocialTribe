import os
import json
import uuid
from threading import RLock
from datetime import datetime, UTC
from pathlib import Path
from typing import Dict, List, Optional, Any, Set

from core.exceptions import RegistryPersistenceError, GraphNotFoundError
from logger_config import get_logger
from utils.app_paths import AppPaths

logger = get_logger(__name__)

# ============================================================
# [1] Configuration
# ============================================================

BASE_DIR = AppPaths.get_base_path()

# Using environment variable for registry path
REGISTRY_PATH_ENV = os.getenv("REGISTRY_PATH", "")
if REGISTRY_PATH_ENV:
    REGISTRY_FILE = Path(REGISTRY_PATH_ENV)
else:
    REGISTRY_FILE = BASE_DIR / "graph_registry.json"

# Make sure the directory exists
try:
    REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    logger.info(
        "Registry directory initialized",
        extra={"extra_data": {"path": str(REGISTRY_FILE.parent)}}
    )
except OSError as e:
    logger.error(
        f"Failed to create registry directory: {e}",
        extra={"extra_data": {"path": str(REGISTRY_FILE.parent)}}
    )
    # Fallback to /tmp
    REGISTRY_FILE = Path("/tmp/graph_registry.json")
    REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
    logger.warning(
        f"Using fallback registry path: {REGISTRY_FILE}"
    )


# ============================================================
# [2] GraphRegistry Class
# ============================================================

class GraphRegistry:
    """
    Thread-safe graph registry with persistence.
    Manages graph lifecycle, nodes, edges, and datasets.
    """

    def __init__(self):
        self._lock = RLock()
        self._active_graph: Optional[str] = None
        self._graphs: Dict[str, Dict[str, Any]] = {}
        self._datasets: Dict[str, Dict[str, Any]] = {}
        self._load()

    # ============================================================
    # [3] Persistence
    # ============================================================

    def _load(self) -> None:
        """Load registry from file with error handling"""
        with self._lock:
            try:
                if not REGISTRY_FILE.exists():
                    logger.info("No existing registry found, creating new one")
                    self._save()
                    return

                with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)

                self._active_graph = data.get("active_graph")
                self._graphs = {}
                self._datasets = data.get("datasets", {})

                # Restore graph data
                for graph_id, graph in data.get("graphs", {}).items():
                    self._graphs[graph_id] = {
                        "name": graph.get("name", graph_id),
                        "created_at": graph.get("created_at"),
                        "node_ids": set(graph.get("node_ids", [])),
                        "edge_ids": set(graph.get("edge_ids", [])),
                    }

                logger.info(
                    f"Loaded {len(self._graphs)} graphs and {len(self._datasets)} datasets"
                )

            except json.JSONDecodeError as e:
                logger.error(f"Corrupted registry file: {e}")
                self._graphs = {}
                self._datasets = {}
                self._active_graph = None
                self._save()

            except Exception as e:
                logger.exception("Failed to load graph registry")
                self._graphs = {}
                self._datasets = {}
                self._active_graph = None
                raise RegistryPersistenceError(
                    "Failed to load registry",
                    details={
                        "reason": str(e),
                        "registry_file": str(REGISTRY_FILE),
                    },
                ) from e

    def _save(self) -> None:
        """Save registry to file with atomic write"""
        try:
            with self._lock:
                # Ensure directory exists
                REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)

                # Prepare data for serialization
                data = {
                    "active_graph": self._active_graph,
                    "graphs": {},
                    "datasets": self._datasets,
                    "updated_at": datetime.now(UTC).isoformat(),
                    "version": "1.0.0",
                }

                for graph_id, graph in self._graphs.items():
                    data["graphs"][graph_id] = {
                        "name": graph["name"],
                        "created_at": graph["created_at"],
                        "node_ids": sorted(graph["node_ids"]),
                        "edge_ids": sorted(graph["edge_ids"]),
                    }

                # Atomic write
                temp_path = REGISTRY_FILE.with_suffix(".tmp")
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False, default=str)

                temp_path.replace(REGISTRY_FILE)

        except Exception as e:
            logger.exception("Failed to save registry")
            raise RegistryPersistenceError(
                "Failed to save registry",
                details={
                    "reason": str(e),
                    "registry_file": str(REGISTRY_FILE),
                },
            ) from e

    # ============================================================
    # [4] Graph Lifecycle
    # ============================================================

    def create_graph(self, name: str = "default") -> str:
        """Create a new graph and set it as active"""
        with self._lock:
            logger.info(f"Creating graph: {name}")

            graph_id = f"graph_{uuid.uuid4().hex[:8]}"

            self._graphs[graph_id] = {
                "name": name,
                "created_at": datetime.now(UTC).isoformat(),
                "node_ids": set(),
                "edge_ids": set(),
            }

            self._active_graph = graph_id
            self._save()

            logger.info(f"Created graph: {graph_id}")
            return graph_id

    def delete_graph(self, graph_id: str) -> None:
        """Delete a graph by ID"""
        with self._lock:
            logger.info(f"Deleting graph: {graph_id}")

            if graph_id not in self._graphs:
                logger.warning(f"Graph {graph_id} not found for deletion")
                return

            del self._graphs[graph_id]

            if self._active_graph == graph_id:
                self._active_graph = next(iter(self._graphs), None)

            self._save()

    def graph_exists(self, graph_id: str) -> bool:
        """Check if a graph exists"""
        return graph_id in self._graphs

    def graph_list(self) -> Dict[str, Dict[str, Any]]:
        """Get list of all graphs with metadata"""
        return {
            graph_id: {
                "name": graph["name"],
                "created_at": graph["created_at"],
                "nodes": len(graph["node_ids"]),
                "edges": len(graph["edge_ids"]),
            }
            for graph_id, graph in self._graphs.items()
        }

    def set_active_graph(self, graph_id: str) -> None:
        """Set the active graph"""
        with self._lock:
            if graph_id not in self._graphs:
                raise GraphNotFoundError(
                    f"Graph {graph_id} not found",
                    graph_id=graph_id,
                )

            self._active_graph = graph_id
            self._save()
            logger.info(f"Active graph changed to: {graph_id}")

    def get_active_graph(self) -> str:
        """Get the active graph ID, creating a default one if none exists"""
        if self._active_graph is None or self._active_graph not in self._graphs:
            return self.create_graph()
        return self._active_graph

    def ensure_active_graph(self, name: str = "default") -> str:
        """Ensure an active graph exists"""
        with self._lock:
            if self._active_graph and self._active_graph in self._graphs:
                return self._active_graph
            return self.create_graph(name)

    # ============================================================
    # [5] Dataset Management
    # ============================================================

    def create_dataset(
        self,
        graph_id: str,
        filename: str,
        node_count: int,
        edge_count: int,
    ) -> str:
        """Create a new dataset entry"""
        logger.info(f"Registering dataset: graph={graph_id}, file={filename}")

        dataset_id = f"dataset_{uuid.uuid4().hex[:8]}"

        self._datasets[dataset_id] = {
            "graph_id": graph_id,
            "name": filename,
            "created_at": datetime.now(UTC).isoformat(),
            "node_count": node_count,
            "edge_count": edge_count,
        }

        self._save()
        return dataset_id

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Get a dataset by ID"""
        return self._datasets.get(dataset_id)

    def get_datasets(self) -> Dict[str, Dict[str, Any]]:
        """Get all datasets"""
        return self._datasets

    def datasets_for_graph(self, graph_id: str) -> Dict[str, Dict[str, Any]]:
        """Get all datasets for a specific graph"""
        return {
            k: v
            for k, v in self._datasets.items()
            if v.get("graph_id") == graph_id
        }

    def delete_dataset(self, dataset_id: str) -> bool:
        """Delete a dataset by ID"""
        with self._lock:
            if dataset_id in self._datasets:
                del self._datasets[dataset_id]
                self._save()
                return True
            return False

    # ============================================================
    # [6] Node Operations
    # ============================================================

    def add_node(self, node_id: str, graph_id: Optional[str] = None) -> None:
        """Add a node to a graph"""
        with self._lock:
            logger.debug(f"Adding node {node_id} to graph {graph_id}")
            self._get_graph(graph_id)["node_ids"].add(node_id)
            self._save()

    def remove_node(self, node_id: str, graph_id: Optional[str] = None) -> None:
        """Remove a node from a graph"""
        with self._lock:
            logger.debug(f"Removing node {node_id}")
            self._get_graph(graph_id)["node_ids"].discard(node_id)
            self._save()

    def get_all_nodes(self, graph_id: Optional[str] = None) -> List[str]:
        """Get all node IDs in a graph"""
        return list(self._get_graph(graph_id)["node_ids"])

    def contains_node(self, node_id: str, graph_id: Optional[str] = None) -> bool:
        """Check if a node exists in a graph"""
        return node_id in self._get_graph(graph_id)["node_ids"]

    def get_node_count(self, graph_id: Optional[str] = None) -> int:
        """Get number of nodes in a graph"""
        return len(self._get_graph(graph_id)["node_ids"])

    # ============================================================
    # [7] Edge Operations
    # ============================================================

    def add_edge(self, edge_id: str, graph_id: Optional[str] = None) -> None:
        """Add an edge to a graph"""
        with self._lock:
            logger.debug(f"Adding edge {edge_id} to graph {graph_id}")
            self._get_graph(graph_id)["edge_ids"].add(edge_id)
            self._save()

    def remove_edge(self, edge_id: str, graph_id: Optional[str] = None) -> None:
        """Remove an edge from a graph"""
        with self._lock:
            logger.debug(f"Removing edge {edge_id}")
            self._get_graph(graph_id)["edge_ids"].discard(edge_id)
            self._save()

    def get_all_edges(self, graph_id: Optional[str] = None) -> List[str]:
        """Get all edge IDs in a graph"""
        return list(self._get_graph(graph_id)["edge_ids"])

    def contains_edge(self, edge_id: str, graph_id: Optional[str] = None) -> bool:
        """Check if an edge exists in a graph"""
        return edge_id in self._get_graph(graph_id)["edge_ids"]

    def get_edge_count(self, graph_id: Optional[str] = None) -> int:
        """Get number of edges in a graph"""
        return len(self._get_graph(graph_id)["edge_ids"])

    # ============================================================
    # [8] Stats & Info
    # ============================================================

    def stats(self, graph_id: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics for a graph"""
        graph = self._get_graph(graph_id)
        actual_graph_id = graph_id or self._active_graph

        return {
            "graph_id": actual_graph_id,
            "name": graph["name"],
            "nodes": len(graph["node_ids"]),
            "edges": len(graph["edge_ids"]),
            "created_at": graph["created_at"],
            "datasets": len(self.datasets_for_graph(actual_graph_id)),
        }

    def get_registry_info(self) -> Dict[str, Any]:
        """Get general registry information"""
        return {
            "total_graphs": len(self._graphs),
            "total_datasets": len(self._datasets),
            "active_graph": self._active_graph,
            "registry_path": str(REGISTRY_FILE),
            "graphs": self.graph_list(),
        }

    # ============================================================
    # [9] Import/Export
    # ============================================================

    def export_ids(self, graph_id: Optional[str] = None) -> Dict[str, List[str]]:
        """Export all node and edge IDs from a graph"""
        graph = self._get_graph(graph_id)
        return {
            "nodes": list(graph["node_ids"]),
            "edges": list(graph["edge_ids"]),
        }

    def import_ids(
        self,
        node_ids: List[str],
        edge_ids: List[str],
        graph_id: Optional[str] = None,
    ) -> None:
        """Import node and edge IDs into a graph"""
        logger.info(
            f"Importing IDs into graph {graph_id}: "
            f"nodes={len(node_ids)}, edges={len(edge_ids)}"
        )

        graph = self._get_graph(graph_id)
        graph["node_ids"].update(node_ids)
        graph["edge_ids"].update(edge_ids)
        self._save()

    # ============================================================
    # [10] Cleanup
    # ============================================================

    def clear_all(self) -> None:
        """Clear all data from registry"""
        with self._lock:
            logger.warning("Clearing all registry data")
            self._graphs.clear()
            self._datasets.clear()
            self._active_graph = None
            self._save()

    def remove_orphaned_datasets(self) -> int:
        """Remove datasets that reference non-existent graphs"""
        with self._lock:
            orphaned = []
            for dataset_id, dataset in self._datasets.items():
                if dataset.get("graph_id") not in self._graphs:
                    orphaned.append(dataset_id)

            for dataset_id in orphaned:
                del self._datasets[dataset_id]

            if orphaned:
                self._save()
                logger.info(f"Removed {len(orphaned)} orphaned datasets")

            return len(orphaned)

    # ============================================================
    # [11] Helpers
    # ============================================================

    def _get_graph(self, graph_id: Optional[str] = None) -> Dict[str, Any]:
        """Get a graph by ID with validation"""
        actual_graph_id = graph_id or self.get_active_graph()

        if actual_graph_id not in self._graphs:
            raise GraphNotFoundError(
                f"Graph {actual_graph_id} not found",
                graph_id=actual_graph_id,
            )

        return self._graphs[actual_graph_id]
