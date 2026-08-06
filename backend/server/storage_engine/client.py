import os
import grpc
import time
from typing import Optional, Dict, List, Tuple, Any

from core.exceptions import (
    StorageError,
    StorageOperationError,
    StorageConnectionError
)
from storage_engine import (
    storage_pb2 as pb,
    storage_pb2_grpc as pb_grpc
)
from storage_engine.mapper import ProtoMapper
from schemas.graph_view import Node, Edge
from logger_config import get_logger

logger = get_logger(__name__)

# ============================================================
# [1] Configuration
# ============================================================

class StorageConfig:
    """Storage client configuration from environment"""

    @staticmethod
    def get_host() -> str:
        return os.getenv("STORAGE_HOST", "localhost")

    @staticmethod
    def get_port() -> int:
        return int(os.getenv("STORAGE_PORT", "50051"))

    @staticmethod
    def get_timeout() -> int:
        return int(os.getenv("STORAGE_TIMEOUT", "10"))

    @staticmethod
    def get_max_attempts() -> int:
        return int(os.getenv("STORAGE_RETRY_ATTEMPTS", "20"))

    @staticmethod
    def get_retry_interval() -> float:
        return float(os.getenv("STORAGE_RETRY_DELAY", "2.0"))


# ============================================================
# [2] StorageClient
# ============================================================

class StorageClient:
    """
    Production-grade gRPC client for storage service.
    Thread-safe with automatic reconnection.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        timeout: Optional[int] = None,
        max_attempts: Optional[int] = None,
        retry_interval: Optional[float] = None,
    ):
        # Load configuration from environment or parameters
        self.host = host or StorageConfig.get_host()
        self.port = port or StorageConfig.get_port()
        self.timeout = timeout or StorageConfig.get_timeout()
        self.max_attempts = max_attempts or StorageConfig.get_max_attempts()
        self.retry_interval = retry_interval or StorageConfig.get_retry_interval()
        self._connected = False
        self._channel = None
        self._stub = None

        self._connect()
        self._wait_until_ready()

    # ============================================================
    # [3] Connection Management
    # ============================================================

    def _connect(self) -> None:
        """Establish gRPC channel"""
        address = f"{self.host}:{self.port}"
        logger.info(
            f"Connecting to storage service at {address}",
            extra={"extra_data": {"host": self.host, "port": self.port}}
        )

        try:
            self._channel = grpc.insecure_channel(
                address,
                options=[
                    ('grpc.max_receive_message_length', 100 * 1024 * 1024),
                    ('grpc.max_send_message_length', 100 * 1024 * 1024),
                    ('grpc.keepalive_time_ms', 30000),
                    ('grpc.keepalive_timeout_ms', 10000),
                    ('grpc.keepalive_permit_without_calls', True),
                ]
            )
            self._stub = pb_grpc.StorageServiceStub(self._channel)
            self._connected = True
        except Exception as e:
            logger.error(f"Failed to connect to storage: {e}")
            raise StorageConnectionError(f"Failed to connect: {e}") from e

    def _reconnect(self) -> None:
        """Reconnect to storage service"""
        self.close()
        self._connect()

    def _wait_until_ready(self) -> None:
        """Wait for storage service to become available"""
        for attempt in range(1, self.max_attempts + 1):
            if self._ping():
                logger.info(
                    f"Storage gRPC is ready (attempt={attempt}/{self.max_attempts})"
                )
                return

            if attempt < self.max_attempts:
                logger.warning(
                    f"Storage gRPC is unavailable (attempt={attempt}/{self.max_attempts}). "
                    f"Retrying in {self.retry_interval}s..."
                )
                time.sleep(self.retry_interval)

        logger.error(f"Storage gRPC did not become ready after {self.max_attempts} attempts.")
        raise StorageConnectionError(
            f"Storage gRPC is unavailable after {self.max_attempts} startup attempts."
        )

    def _ping(self) -> bool:
        """Check if storage service is available"""
        try:
            self._stub.GetStats(pb.GetStatsRequest(), timeout=2)
            return True
        except grpc.RpcError:
            return False
        except Exception:
            return False

    def _ensure_connected(self) -> None:
        """Ensure connection is alive, reconnect if needed"""
        if not self._connected or not self._ping():
            self._reconnect()
            self._wait_until_ready()

    def close(self) -> None:
        """Close the gRPC channel"""
        try:
            if self._channel:
                self._channel.close()
                self._channel = None
                self._stub = None
                self._connected = False
        except Exception as e:
            logger.exception(f"Failed to close gRPC channel: {e}")

    # ============================================================
    # [4] Context Manager
    # ============================================================

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    # ============================================================
    # [5] Health Check
    # ============================================================

    def ping(self) -> bool:
        """Public ping method"""
        return self._ping()

    def wait_until_ready(
        self,
        max_attempts: Optional[int] = None,
        retry_interval: Optional[float] = None,
    ) -> None:
        """Wait for storage service to become ready"""
        self._wait_until_ready()

    def is_connected(self) -> bool:
        """Check if client is connected"""
        return self._connected

    # ============================================================
    # [6] Node CRUD Operations
    # ============================================================

    def create_node(self, node: Node, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.CreateNode(
                pb.CreateNodeRequest(
                    key=key,
                    node=ProtoMapper.node_to_proto(node)
                ),
                timeout=self.timeout
            )
            if not response.success:
                raise StorageOperationError(response.error)
            return True
        except grpc.RpcError as e:
            logger.exception(f"CreateNode gRPC error: {node.id}")
            raise StorageConnectionError(str(e)) from e

    def get_node(self, key: str) -> Optional[Node]:
        if not key:
            return None
        self._ensure_connected()
        try:
            response = self._stub.GetNode(
                pb.GetNodeRequest(key=key),
                timeout=self.timeout
            )
            if not response.found:
                return None
            return ProtoMapper.proto_to_node(response.node)
        except grpc.RpcError as e:
            logger.exception(f"GetNode gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def get_nodes_bulk(self, keys: List[str]) -> Dict[str, Node]:
        if not keys:
            return {}
        self._ensure_connected()
        try:
            response = self._stub.GetNodeBulk(
                pb.GetNodeBulkRequest(keys=keys),
                timeout=self.timeout
            )
            result = {}
            for key, node in response.nodes.items():
                result[key] = ProtoMapper.proto_to_node(node)
            return result
        except grpc.RpcError as e:
            logger.exception("GetNodeBulk gRPC error")
            raise StorageConnectionError(str(e)) from e

    def update_node(self, node: Node, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.UpdateNode(
                pb.UpdateNodeRequest(
                    key=key,
                    node=ProtoMapper.node_to_proto(node)
                ),
                timeout=self.timeout
            )
            if not response.success:
                raise StorageOperationError(response.error)
            return True
        except grpc.RpcError as e:
            logger.exception(f"UpdateNode gRPC error: {node.id}")
            raise StorageConnectionError(str(e)) from e

    def delete_node(self, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.DeleteNode(
                pb.DeleteNodeRequest(key=key),
                timeout=self.timeout
            )
            if not response.success:
                raise StorageOperationError(response.error)
            return True
        except grpc.RpcError as e:
            logger.exception(f"DeleteNode gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def delete_nodes_bulk(self, keys: List[str]) -> int:
        if not keys:
            return 0
        self._ensure_connected()
        try:
            response = self._stub.DeleteNodeBulk(
                pb.DeleteNodeBulkRequest(keys=keys),
                timeout=self.timeout
            )
            if response.failed_keys:
                logger.warning(f"Failed node deletions: {response.failed_keys}")
            return response.deleted_count
        except grpc.RpcError as e:
            logger.exception("DeleteNodeBulk gRPC error")
            raise StorageConnectionError(str(e)) from e

    def contains_node(self, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.ContainsNode(
                pb.ContainsNodeRequest(key=key),
                timeout=self.timeout
            )
            return response.exists
        except grpc.RpcError as e:
            logger.exception(f"ContainsNode gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def peek_node(self, key: str) -> Tuple[Optional[Node], bool]:
        self._ensure_connected()
        try:
            response = self._stub.PeekNode(
                pb.PeekNodeRequest(key=key),
                timeout=self.timeout
            )
            if not response.found:
                return None, response.in_cache
            node = ProtoMapper.proto_to_node(response.node)
            return node, response.in_cache
        except grpc.RpcError as e:
            logger.exception(f"PeekNode gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [7] Edge CRUD Operations
    # ============================================================

    def create_edge(self, edge: Edge, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.CreateEdge(
                pb.CreateEdgeRequest(
                    key=key,
                    edge=ProtoMapper.edge_to_proto(edge)
                ),
                timeout=self.timeout
            )
            if not response.success:
                raise StorageOperationError(response.error)
            return True
        except grpc.RpcError as e:
            logger.exception(f"CreateEdge gRPC error: {edge.id}")
            raise StorageConnectionError(str(e)) from e

    def get_edge(self, key: str) -> Optional[Edge]:
        if not key:
            return None
        self._ensure_connected()
        try:
            response = self._stub.GetEdge(
                pb.GetEdgeRequest(key=key),
                timeout=self.timeout
            )
            if not response.found:
                return None
            return ProtoMapper.proto_to_edge(response.edge)
        except grpc.RpcError as e:
            logger.exception(f"GetEdge gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def get_edges_bulk(self, keys: List[str]) -> Dict[str, Edge]:
        if not keys:
            return {}
        self._ensure_connected()
        try:
            response = self._stub.GetEdgeBulk(
                pb.GetEdgeBulkRequest(keys=keys),
                timeout=self.timeout
            )
            result = {}
            for key, edge in response.edges.items():
                result[key] = ProtoMapper.proto_to_edge(edge)
            return result
        except grpc.RpcError as e:
            logger.exception("GetEdgeBulk gRPC error")
            raise StorageConnectionError(str(e)) from e

    def update_edge(self, edge: Edge, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.UpdateEdge(
                pb.UpdateEdgeRequest(
                    key=key,
                    edge=ProtoMapper.edge_to_proto(edge)
                ),
                timeout=self.timeout
            )
            if not response.success:
                raise StorageOperationError(response.error)
            return True
        except grpc.RpcError as e:
            logger.exception(f"UpdateEdge gRPC error: {edge.id}")
            raise StorageConnectionError(str(e)) from e

    def delete_edge(self, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.DeleteEdge(
                pb.DeleteEdgeRequest(key=key),
                timeout=self.timeout
            )
            if not response.success:
                raise StorageOperationError(response.error)
            return True
        except grpc.RpcError as e:
            logger.exception(f"DeleteEdge gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def delete_edges_bulk(self, keys: List[str]) -> int:
        if not keys:
            return 0
        self._ensure_connected()
        try:
            response = self._stub.DeleteEdgeBulk(
                pb.DeleteEdgeBulkRequest(keys=keys),
                timeout=self.timeout
            )
            if response.failed_keys:
                logger.warning(f"Failed edge deletions: {response.failed_keys}")
            return response.deleted_count
        except grpc.RpcError as e:
            logger.exception("DeleteEdgeBulk gRPC error")
            raise StorageConnectionError(str(e)) from e

    def contains_edge(self, key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.ContainsEdge(
                pb.ContainsEdgeRequest(key=key),
                timeout=self.timeout
            )
            return response.exists
        except grpc.RpcError as e:
            logger.exception(f"ContainsEdge gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def peek_edge(self, key: str) -> Tuple[Optional[Edge], bool]:
        self._ensure_connected()
        try:
            response = self._stub.PeekEdge(
                pb.PeekEdgeRequest(key=key),
                timeout=self.timeout
            )
            if not response.found:
                return None, response.in_cache
            edge = ProtoMapper.proto_to_edge(response.edge)
            return edge, response.in_cache
        except grpc.RpcError as e:
            logger.exception(f"PeekEdge gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [8] Prefetch
    # ============================================================

    def prefetch_viewport(self, node_ids: List[str]) -> int:
        if not node_ids:
            return 0
        self._ensure_connected()
        try:
            response = self._stub.PrefetchViewport(
                pb.PrefetchViewportRequest(node_ids=node_ids),
                timeout=self.timeout
            )
            return response.prefetched_count
        except grpc.RpcError as e:
            logger.exception("PrefetchViewport gRPC error")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [9] Degree Operations
    # ============================================================

    def get_degree(self, key: str) -> int:
        self._ensure_connected()
        try:
            response = self._stub.GetDegree(
                pb.GetDegreeRequest(key=key),
                timeout=self.timeout
            )
            if not response.found:
                return 0
            return response.degree
        except grpc.RpcError as e:
            logger.exception(f"GetDegree gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def get_degree_batch(self, keys: List[str]) -> Dict[str, int]:
        if not keys:
            return {}
        self._ensure_connected()
        try:
            response = self._stub.GetDegreeBatch(
                pb.GetDegreeBatchRequest(keys=keys),
                timeout=self.timeout
            )
            return dict(response.degrees)
        except grpc.RpcError as e:
            logger.exception("GetDegreeBatch gRPC error")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [10] Neighbor Operations
    # ============================================================

    def get_neighbors(self, key: str) -> List[str]:
        self._ensure_connected()
        try:
            response = self._stub.GetNeighbors(
                pb.GetNeighborsRequest(key=key),
                timeout=self.timeout
            )
            if not response.found:
                return []
            return list(response.neighbors)
        except grpc.RpcError as e:
            logger.exception(f"GetNeighbors gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def get_neighbors_batch(self, keys: List[str]) -> Dict[str, List[str]]:
        if not keys:
            return {}
        self._ensure_connected()
        try:
            response = self._stub.GetNeighborsBatch(
                pb.GetNeighborsBatchRequest(keys=keys),
                timeout=self.timeout
            )
            if response.error:
                raise StorageError(response.error)
            result = {}
            for node_id, neighbor_list in response.neighbors.items():
                result[node_id] = list(neighbor_list.neighbors)
            return result
        except grpc.RpcError as e:
            logger.exception("GetNeighborsBatch gRPC error")
            raise StorageConnectionError(str(e)) from e

    def get_neighbors_with_weights(self, key: str) -> Dict[str, int]:
        self._ensure_connected()
        try:
            response = self._stub.GetNeighborsWithWeights(
                pb.GetNeighborsWithWeightsRequest(key=key),
                timeout=self.timeout
            )
            if not response.found:
                return {}
            return dict(response.neighbors)
        except grpc.RpcError as e:
            logger.exception(f"GetNeighborsWithWeights gRPC error: {key}")
            raise StorageConnectionError(str(e)) from e

    def is_neighbor(self, source_key: str, target_key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.IsNeighbor(
                pb.IsNeighborRequest(
                    source=source_key,
                    target=target_key
                ),
                timeout=self.timeout
            )
            return response.is_neighbor
        except grpc.RpcError as e:
            logger.exception(f"IsNeighbor gRPC error: {source_key} -> {target_key}")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [11] Edge Operations
    # ============================================================

    def has_edge(self, source_key: str, target_key: str) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.HasEdge(
                pb.HasEdgeRequest(
                    source=source_key,
                    target=target_key
                ),
                timeout=self.timeout
            )
            return response.exists
        except grpc.RpcError as e:
            logger.exception(f"HasEdge gRPC error: {source_key} -> {target_key}")
            raise StorageConnectionError(str(e)) from e

    def has_edge_batch(self, source_key: str, targets_key: List[str]) -> Dict[str, bool]:
        if not targets_key:
            return {}
        self._ensure_connected()
        try:
            response = self._stub.HasEdgeBatch(
                pb.HasEdgeBatchRequest(
                    source=source_key,
                    targets=targets_key
                ),
                timeout=self.timeout
            )
            return dict(response.results)
        except grpc.RpcError as e:
            logger.exception(f"HasEdgeBatch gRPC error: {source_key}")
            raise StorageConnectionError(str(e)) from e

    def get_edge_weight(self, source_key: str, target_key: str) -> int:
        self._ensure_connected()
        try:
            response = self._stub.GetEdgeWeight(
                pb.GetEdgeWeightRequest(
                    source=source_key,
                    target=target_key
                ),
                timeout=self.timeout
            )
            if not response.found:
                return 0
            return response.weight
        except grpc.RpcError as e:
            logger.exception(f"GetEdgeWeight gRPC error: {source_key} -> {target_key}")
            raise StorageConnectionError(str(e)) from e

    def get_edge_weights_batch(self, edges: List[Tuple[str, str]]) -> Dict[str, int]:
        if not edges:
            return {}
        self._ensure_connected()
        try:
            pairs = []
            for source, target in edges:
                pairs.append(pb.EdgePair(source=source, target=target))
            response = self._stub.GetEdgeWeightsBatch(
                pb.GetEdgeWeightsBatchRequest(edges=pairs),
                timeout=self.timeout
            )
            return dict(response.weights)
        except grpc.RpcError as e:
            logger.exception("GetEdgeWeightsBatch gRPC error")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [12] Common Neighbors
    # ============================================================

    def common_neighbors(self, source_key: str, target_key: str) -> List[str]:
        self._ensure_connected()
        try:
            response = self._stub.GetCommonNeighbors(
                pb.GetCommonNeighborsRequest(
                    source=source_key,
                    target=target_key
                ),
                timeout=self.timeout
            )
            if not response.found:
                return []
            return list(response.neighbors)
        except grpc.RpcError as e:
            logger.exception(f"CommonNeighbors gRPC error: {source_key} -> {target_key}")
            raise StorageConnectionError(str(e)) from e

    def count_common_neighbors(self, source_key: str, target_key: str) -> int:
        self._ensure_connected()
        try:
            response = self._stub.CountCommonNeighbors(
                pb.CountCommonNeighborsRequest(
                    source=source_key,
                    target=target_key
                ),
                timeout=self.timeout
            )
            if not response.found:
                return 0
            return response.count
        except grpc.RpcError as e:
            logger.exception(f"CountCommonNeighbors gRPC error: {source_key} -> {target_key}")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [13] Shortest Path
    # ============================================================

    def shortest_path(self, source_key: str, target_key: str) -> List[str]:
        self._ensure_connected()
        try:
            response = self._stub.ShortestPath(
                pb.ShortestPathRequest(
                    source=source_key,
                    target=target_key
                ),
                timeout=self.timeout
            )
            if not response.found:
                return []
            return list(response.path)
        except grpc.RpcError as e:
            logger.exception(f"ShortestPath gRPC error: {source_key} -> {target_key}")
            raise StorageConnectionError(str(e)) from e

    # ============================================================
    # [14] Stats
    # ============================================================

    def stats(self) -> Any:
        self._ensure_connected()
        try:
            return self._stub.GetStats(
                pb.GetStatsRequest(),
                timeout=self.timeout
            )
        except grpc.RpcError as e:
            logger.exception("GetStats gRPC error")
            raise StorageConnectionError(str(e)) from e

    def cache_stats(self) -> Any:
        self._ensure_connected()
        try:
            return self._stub.GetCacheStats(
                pb.GetCacheStatsRequest(),
                timeout=self.timeout
            )
        except grpc.RpcError as e:
            logger.exception("GetCacheStats gRPC error")
            raise StorageConnectionError(str(e)) from e

    def clear_cache(self) -> bool:
        self._ensure_connected()
        try:
            response = self._stub.ClearCache(
                pb.ClearCacheRequest(),
                timeout=self.timeout
            )
            if not response.success:
                raise StorageOperationError(response.error)
            return True
        except grpc.RpcError as e:
            logger.exception("ClearCache gRPC error")
            raise StorageConnectionError(str(e)) from e
