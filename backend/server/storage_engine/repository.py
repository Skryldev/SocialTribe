from threading import RLock
from typing import Optional

from logger_config import get_logger
from schemas.graph_view import (
    Node,
    Edge,
)
from storage_engine.client import (
    StorageClient
)
from storage_engine.registry import (
    GraphRegistry
)

from core.exceptions import (
    NodeNotFoundError,
    EdgeNotFoundError,
    RepositoryError
)

logger = get_logger(__name__)


class GraphRepository:
    """
    High-level repository that coordinates between the gRPC Storage service
    and the local GraphRegistry.

    Design principles:
      - Storage is the source of truth for node/edge existence.
      - Registry is a local cache of graph membership (nodes/edges per graph).
      - Graph operations (neighbours, degrees, paths) delegate validation to
        the Storage layer and only use the Registry for post-filtering against
        the current graph's node set.
    """

    def __init__(
            self,
            storage: StorageClient,
            registry: GraphRegistry,
    ):
        self.storage = storage
        self.registry = registry
        self.mu = RLock()

    # =====================================================
    # Graph
    # =====================================================

    def _graph_id(
            self,
            graph_id: str | None = None,
    ) -> str:
        """Resolve the active graph id, creating a default graph if needed."""
        if graph_id:
            return graph_id

        gid = self.registry.get_active_graph()
        if gid:
            logger.debug("Resolved graph id %s", gid)
            return gid

        return self.registry.create_graph("default")

    def stats(
            self,
            graph_id: str | None = None,
    ):
        return self.registry.stats(self._graph_id(graph_id))

    def node_count(
            self,
            graph_id: str | None = None,
    ) -> int:
        return len(self.registry.get_all_nodes(self._graph_id(graph_id)))

    def edge_count(
            self,
            graph_id: str | None = None,
    ) -> int:
        return len(self.registry.get_all_edges(self._graph_id(graph_id)))

    # =====================================================
    # Node CRUD
    # =====================================================

    def add_node(
            self,
            node: Node,
            graph_id: str | None = None,
    ) -> bool:
        gid = self._graph_id(graph_id)

        try:
            logger.debug("Adding node %s graph=%s", node.id, gid)

            self.storage.create_node(node=node, key=node.id)
            self.registry.add_node(node.id, gid)

            return True

        except Exception as e:
            logger.exception("Failed to add node")
            raise RepositoryError(
                "Failed to add node.",
                graph_id=gid,
                node_id=node.id,
                details={"reason": str(e)},
            ) from e

    def get_node(
            self,
            node_id: str,
            graph_id: str | None = None,
    ) -> Optional[Node]:
        logger.debug("Fetching node %s", node_id)

        gid = self._graph_id(graph_id)

        if not self.registry.contains_node(node_id, gid):
            return None

        return self.storage.get_node(node_id)

    def get_nodes(
            self,
            graph_id: str | None = None,
    ) -> list[Node]:
        keys = self.registry.get_all_nodes(self._graph_id(graph_id))

        if not keys:
            return []

        return list(self.storage.get_nodes_bulk(keys).values())

    def update_node(
            self,
            node: Node,
            graph_id: str | None = None,
    ) -> bool:
        gid = self._graph_id(graph_id)

        if not self.registry.contains_node(node.id, gid):
            raise NodeNotFoundError(
                f"Node {node.id} not found.",
                graph_id=gid,
                node_id=node.id,
            )

        return self.storage.update_node(node=node, key=node.id)

    def delete_node(
            self,
            node_id: str,
            graph_id: str | None = None,
    ) -> bool:
        gid = self._graph_id(graph_id)

        if not self.registry.contains_node(node_id, gid):
            raise NodeNotFoundError(
                f"Node {node_id} not found.",
                graph_id=gid,
                node_id=node_id,
            )

        self.storage.delete_node(node_id)
        self.registry.remove_node(node_id, gid)

        return True

    def contains_node(
            self,
            node_id: str,
            graph_id: str | None = None,
    ) -> bool:
        return self.registry.contains_node(node_id, self._graph_id(graph_id))

    def peek_node(
            self,
            node_id: str,
            graph_id: str | None = None,
    ):
        if not self.contains_node(node_id, graph_id):
            return None, False

        return self.storage.peek_node(node_id)

    def get_nodes_bulk(
            self,
            node_ids: list[str],
            graph_id: str | None = None,
    ) -> dict[str, Node]:
        if not node_ids:
            return {}

        gid = self._graph_id(graph_id)

        # Keep only node identifiers that belong to the requested graph.

        valid_ids = [
            node_id
            for node_id in node_ids
            if self.registry.contains_node(node_id, gid)
        ]

        if not valid_ids:
            return {}

        return self.storage.get_nodes_bulk(valid_ids)

    def get_edges_bulk(
            self,
            edge_ids: list[str],
            graph_id: str | None = None,
    ) -> dict[str, Edge]:
        if not edge_ids:
            return {}

        gid = self._graph_id(graph_id)

        # Keep only edge identifiers that belong to the requested graph.

        valid_ids = [
            edge_id
            for edge_id in edge_ids
            if self.registry.contains_edge(edge_id, gid)
        ]

        if not valid_ids:
            return {}

        return self.storage.get_edges_bulk(valid_ids)

    def get_node_ids(
            self,
            graph_id=None,
    ):
        return list(self.registry.get_all_nodes(self._graph_id(graph_id)))

    # =====================================================
    # Edge CRUD
    # =====================================================

    def add_edge(
            self,
            edge: Edge,
            graph_id: str | None = None,
    ) -> bool:
        logger.debug("Adding edge %s", edge.id)
        gid = self._graph_id(graph_id)

        if not self.registry.contains_node(edge.source, gid):
            raise NodeNotFoundError(
                f"Source node {edge.source} not found.",
                graph_id=gid,
                node_id=edge.source,
            )

        if not self.registry.contains_node(edge.target, gid):
            raise NodeNotFoundError(
                f"Target node {edge.target} not found.",
                graph_id=gid,
                node_id=edge.target,
            )

        self.storage.create_edge(edge=edge, key=edge.id)

        self.registry.add_edge(edge.id, gid)

        return True

    def get_edge(
            self,
            edge_id: str,
            graph_id: str | None = None,
    ) -> Optional[Edge]:
        gid = self._graph_id(graph_id)

        if not self.registry.contains_edge(edge_id, gid):
            return None

        return self.storage.get_edge(edge_id)

    def get_edges(
            self,
            graph_id: str | None = None,
    ) -> list[Edge]:
        keys = self.registry.get_all_edges(self._graph_id(graph_id))

        if not keys:
            return []

        return list(self.storage.get_edges_bulk(keys).values())

    def update_edge(
            self,
            edge: Edge,
    ) -> bool:
        return self.storage.update_edge(edge=edge, key=edge.id)

    def delete_edge(
            self,
            edge_id: str,
            graph_id: str | None = None,
    ) -> bool:
        gid = self._graph_id(graph_id)

        if not self.registry.contains_edge(edge_id, gid):
            raise EdgeNotFoundError(
                f"Edge {edge_id} not found.",
                graph_id=gid,
                edge_id=edge_id,
            )

        self.storage.delete_edge(edge_id)
        self.registry.remove_edge(edge_id, gid)

        return True

    def contains_edge(
            self,
            edge_id: str,
            graph_id: str | None = None,
    ) -> bool:
        return self.registry.contains_edge(edge_id, self._graph_id(graph_id))

    def peek_edge(
            self,
            edge_id: str,
            graph_id: str | None = None,
    ):
        if not self.contains_edge(edge_id, graph_id):
            return None, False

        return self.storage.peek_edge(edge_id)

    # =====================================================
    # Graph Operations
    # =====================================================

    # -- Degree ---------------------------------------------------------------

    def degree(
            self,
            node_id: str,
            graph_id: str | None = None,
    ) -> int:
        """
        Return the undirected degree of *node_id* within the active graph.

        Validation is delegated to the Storage layer; the Registry is only
        used as a fast local check to short-circuit unknown nodes.
        """
        gid = self._graph_id(graph_id)

        if not self.registry.contains_node(node_id, gid):
            return 0

        return self.storage.get_degree(node_id)

    def degree_batch(
            self,
            node_ids: list[str],
            graph_id: str | None = None,
    ):
        """
        Return a ``{node_id: degree}`` mapping for every *node_id* that
        belongs to the active graph.
        """
        gid = self._graph_id(graph_id)

        valid_ids = [
            nid for nid in node_ids
            if self.registry.contains_node(nid, gid)
        ]

        return self.storage.get_degree_batch(valid_ids)

    # -- Neighbours -----------------------------------------------------------

    def neighbors(
            self,
            node_id: str,
            graph_id: str | None = None,
    ) -> list[str]:
        """
        Return the undirected neighbours of *node_id*.

        The Storage layer is the authority on edge existence.  Results are
        post-filtered to nodes that belong to the active graph.
        """
        gid = self._graph_id(graph_id)

        # ✅ Delegate validation to Storage — do NOT filter by Registry here
        neighbors = self.storage.get_neighbors(node_id)

        graph_nodes = set(self.registry.get_all_nodes(gid))

        return [n for n in neighbors if n in graph_nodes]

    def neighbors_batch(
            self,
            node_ids: list[str],
            graph_id: str | None = None,
    ) -> dict[str, list[str]]:

        gid = self._graph_id(graph_id)


        # ✅ Send ALL requested ids — Storage validates internally
        result = self.storage.get_neighbors_batch(node_ids)

        graph_nodes = set(self.registry.get_all_nodes(gid))

        # Build undirected adjacency
        adjacency: dict[str, set[str]] = {}

        for source, neighbors in result.items():
            if source not in adjacency:
                adjacency[source] = set()
            for target in neighbors:
                if target not in graph_nodes:
                    continue
                adjacency[source].add(target)
                # ✅ Explicitly add the reverse edge (undirected graph)
                if target not in adjacency:
                    adjacency[target] = set()
                adjacency[target].add(source)

        return {node: sorted(neighs) for node, neighs in adjacency.items()}

    def neighbors_with_weights(
            self,
            node_id: str,
            graph_id: str | None = None,
    ) -> dict[str, int]:
        """
        Return ``{neighbor: weight}`` for *node_id*.

        Validation is delegated to Storage; results are post-filtered to the
        active graph.
        """
        gid = self._graph_id(graph_id)

        # ✅ Delegate validation to Storage
        result = self.storage.get_neighbors_with_weights(node_id)

        graph_nodes = set(self.registry.get_all_nodes(gid))

        return {n: w for n, w in result.items() if n in graph_nodes}

    # -- Edge Existence -------------------------------------------------------

    def has_edge(
            self,
            source: str,
            target: str,
            graph_id: str | None = None,
    ) -> bool:
        gid = self._graph_id(graph_id)

        if (
                not self.registry.contains_node(source, gid)
                or not self.registry.contains_node(target, gid)
        ):
            return False

        return self.storage.has_edge(source, target)

    def has_edge_batch(
            self,
            source: str,
            targets: list[str],
            graph_id: str | None = None,
    ) -> dict[str, bool]:
        gid = self._graph_id(graph_id)

        if not self.registry.contains_node(source, gid):
            return {}

        valid_targets = [
            t for t in targets
            if self.registry.contains_node(t, gid)
        ]

        return self.storage.has_edge_batch(source, valid_targets)

    # -- Edge Weight ----------------------------------------------------------

    def edge_weight(
            self,
            source: str,
            target: str,
            graph_id: str | None = None,
    ) -> Optional[int]:
        gid = self._graph_id(graph_id)

        if (
                not self.registry.contains_node(source, gid)
                or not self.registry.contains_node(target, gid)
        ):
            return None

        return self.storage.get_edge_weight(source, target)

    def edge_weights_batch(
            self,
            edges: list[tuple[str, str]],
            graph_id: str | None = None,
    ) -> dict[tuple[str, str], int]:
        gid = self._graph_id(graph_id)

        valid_edges = [
            (s, t) for s, t in edges
            if (
                    self.registry.contains_node(s, gid)
                    and self.registry.contains_node(t, gid)
            )
        ]

        return self.storage.get_edge_weights_batch(valid_edges)


    def get_edge_between(
            self,
            source: str,
            target: str,
            graph_id: str | None = None,
    ) -> Optional[Edge]:

        gid = self._graph_id(graph_id)

        edge_ids = self.registry.get_all_edges(gid)

        if not edge_ids:
            return None

        # Load graph edges once before searching for the requested connection.

        edges = self.get_edges_bulk(
            edge_ids,
            gid,
        )

        for edge in edges.values():

            #
            # Graph is undirected
            #

            if (
                    edge.source == source
                    and edge.target == target
            ):
                return edge

            if (
                    edge.source == target
                    and edge.target == source
            ):
                return edge

        return None

    def get_edges_between(
            self,
            pairs: list[tuple[str, str]],
            graph_id: str | None = None,
    ) -> dict[tuple[str, str], Edge]:

        gid = self._graph_id(graph_id)

        edge_ids = self.registry.get_all_edges(gid)

        if not edge_ids:
            return {}

        edges = self.get_edges_bulk(
            edge_ids,
            gid,
        )

        # Build a lookup table for constant-time pair matching.

        pair_lookup = {
            frozenset((s, t)): (s, t)
            for s, t in pairs
        }

        result = {}

        # Match stored edges against the requested endpoint pairs.

        for edge in edges.values():

            key = frozenset(
                (
                    edge.source,
                    edge.target,
                )
            )

            if key in pair_lookup:
                result[
                    pair_lookup[key]
                ] = edge

        return result

    # -- Common Neighbours ----------------------------------------------------

    def common_neighbors(
            self,
            source: str,
            target: str,
            graph_id: str | None = None,
    ) -> list[str]:

        gid = self._graph_id(graph_id)

        if (
                not self.registry.contains_node(source, gid)
                or not self.registry.contains_node(target, gid)
        ):
            return []

        return self.storage.common_neighbors(source, target)

    def count_common_neighbors(
            self,
            source: str,
            target: str,
            graph_id: str | None = None,
    ) -> int:

        gid = self._graph_id(graph_id)

        if (
                not self.registry.contains_node(source, gid)
                or not self.registry.contains_node(target, gid)
        ):
            return 0

        return self.storage.count_common_neighbors(source, target)

    # -- Shortest Path --------------------------------------------------------

    def shortest_path(
            self,
            source: str,
            target: str,
            graph_id: str | None = None,
    ) -> list[str]:
        """Return the shortest path between *source* and *target*."""
        gid = self._graph_id(graph_id)

        if not self.registry.contains_node(target, gid) and not self.registry.contains_node(source, gid):
            return []

        # ✅ Delegate validation to Storage
        return self.storage.shortest_path(source, target)

    # -- Convenience ----------------------------------------------------------

    def is_neighbor(
            self,
            source: str,
            target: str,
            graph_id: str | None = None,
    ) -> bool:
        gid = self._graph_id(graph_id)

        if (
                not self.registry.contains_node(source, gid)
                or not self.registry.contains_node(target, gid)
        ):
            return False

        return self.storage.is_neighbor(source, target)

    # =====================================================
    # Cache
    # =====================================================

    # Prime the storage cache for nodes expected to be accessed next.

    def prefetch_viewport(self, node_ids: list[str]):
        logger.debug("Prefetch viewport nodes=%d", len(node_ids))
        return self.storage.prefetch_viewport(node_ids)

    def clear_cache(self):
        logger.info("Clearing storage cache")
        return self.storage.clear_cache()

    def cache_stats(self):
        logger.debug("Cache stats requested")
        return self.storage.cache_stats()

    def storage_stats(self):
        logger.debug("Storage stats requested")
        return self.storage.stats()