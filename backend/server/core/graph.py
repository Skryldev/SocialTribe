from logger_config import get_logger
from core.graph_analysis_manager import (
    GraphAnalysisManager,
)
from core.graph_crud_manager import (
    GraphCrudManager,
)

from core.graph_rebuild_manager import (
    GraphRebuildManager,
)
from core.graph_algorithm_manager import (
    GraphAlgorithmManager,
)
from core.graph_viewport_manager import (
    GraphViewportManager,
)

from core.graph_layout_manager import (
    GraphLayoutManager,
)

from core.graph_backup_manager import (
    GraphBackupManager,
)

from core.layout_state_manager import (
    LayoutStateManager,
)

from core.graph_query_manager import (
    GraphQueryManager,
)

from schemas.graph_view import (
    GraphData,
    Node,
    Edge,
)
from storage_engine.repository import (
    GraphRepository,
)
from storage_engine.registry import (
    GraphRegistry,
)
from core.spatial_index import SpatialIndex

logger = get_logger(__name__)

# ─────────────────────────────────────────────
# Graph Service
# ─────────────────────────────────────────────

class GraphService:

    def __init__(
            self,
            repository: GraphRepository,
            registry: GraphRegistry,
            spatial_index: SpatialIndex,
    ):

        self.repository = repository
        self.registry = registry
        self.spatialIndex = spatial_index

        # Initialize domain managers responsible for graph operations.

        self.analysis = (
            GraphAnalysisManager(
                self
            )
        )

        logger.info(
            "GraphService initialized successfully"
        )

        self.crud = (
            GraphCrudManager(
                self
            )
        )

        self.rebuild = (
            GraphRebuildManager(
                self
            )
        )
        self.algorithms = (
            GraphAlgorithmManager(
                self
            )
        )

        self.viewport = GraphViewportManager(
            self
        )

        self.backup = GraphBackupManager(
            self
        )

        self.layout = (
            GraphLayoutManager(
                self
            )
        )

        self.layout_state = (
            LayoutStateManager()
        )

        self.query = (
            GraphQueryManager(
                self
            )
        )

        self._dataset_importing = False

        self._rebuild_spatial_index()

    # =====================================================
    # Internal
    # =====================================================

    def _build_graph_data(
            self,
            graph_id=None,
    ) -> GraphData:
        return self.rebuild._build_graph_data(
            graph_id
        )

    def _rebuild_spatial_index(
            self,
            graph_id: str | None = None,
    ):
        return self.rebuild._rebuild_spatial_index(
            graph_id
        )

    def _ensure_analysis_complete(
            self,
            graph_id: str,
    ):
        return self.rebuild._ensure_analysis_complete(
            graph_id
        )

    def rebuild_graph_metadata(
            self,
            graph_id: str | None = None,
            priority_nodes=None,
    ):
        return self.rebuild.rebuild_graph_metadata(
            graph_id,
        )

    def rebuild_edge_weights(
            self,
            graph_id=None,
            priority_nodes=None,
    ):
        return self.rebuild.rebuild_edge_weights(
            graph_id,
        )

    def rebuild_layout(
            self,
            graph_id=None,
    ):
        return self.rebuild.rebuild_layout(
            graph_id
        )

    def rebuild_graph(
            self,
            graph_id=None,
            priority_nodes=None,
    ):
        return self.rebuild.rebuild_graph(
            graph_id,
            priority_nodes
        )

    def rebuild_dataset_import(
            self,
            graph_id=None,
    ):
        return self.rebuild.rebuild_dataset_import(
            graph_id
        )

    # =====================================================
    # Graph
    # =====================================================

    def getGraphStats(
            self,
            graph_id: str | None = None,
    ):
        return self.repository.stats(
            graph_id
        )

    # =====================================================
    # Node CRUD
    # =====================================================

    def addNode(
            self,
            node: Node,
            graph_id: str | None = None,
    ):
        return self.crud.addNode(
            node,
            graph_id
        )

    def getNode(
            self,
            node_id: str,
            graph_id: str | None = None,
    ):
        return self.crud.getNode(
            node_id,
            graph_id,
        )

    def getNodes(
            self,
            graph_id=None,
    ):
        return self.crud.getNodes(
            graph_id
        )

    def updateNode(
            self,
            node: Node,
            graph_id: str | None = None,
    ):
        return self.crud.updateNode(
            node,
            graph_id
        )

    def deleteNode(
            self,
            node_id: str,
            graph_id: str | None = None,
    ):
        self.crud.deleteNode(
            node_id,
            graph_id
        )

    # =====================================================
    # Edge CRUD
    # =====================================================

    def addEdge(
            self,
            edge: Edge,
            graph_id: str | None = None,
    ):
        return self.crud.addEdge(
            edge,
            graph_id
        )

    def getEdge(
            self,
            edge_id: str,
            graph_id: str | None = None,
    ):
        return self.crud.getEdge(
            edge_id,
            graph_id
        )

    def getEdges(
            self,
            graph_id=None,
    ):
        return self.crud.getEdges(
            graph_id
        )

    def updateEdge(
            self,
            edge: Edge,
    ):
        return self.crud.updateEdge(
            edge
        )

    def deleteEdge(
            self,
            edge_id: str,
            graph_id=None,
    ):
        return self.crud.deleteEdge(
            edge_id,
            graph_id
        )

    # =====================================================
    # Spatial
    # =====================================================

    def getViewport(
            self,
            x,
            y,
            width,
            height,
            zoom,
    ):
        return self.viewport.getViewport(
            x,
            y,
            width,
            height,
            zoom,
        )

    # =====================================================
    # Export / Backup
    # =====================================================

    def exportGraph(
            self,
            graph_id=None,
    ):
        return self.backup.exportGraph(
            graph_id
        )

    def createBackup(
            self,
            name: str | None = None,
    ):
        return self.backup.createBackup(
            name
        )

    def loadBackup(
            self,
            backup_id: str,
    ):
        return self.backup.loadBackup(
            backup_id
        )

    def deleteBackup(
            self,
            backup_id: str,
    ):
        return self.backup.deleteBackup(
            backup_id
        )

    def downloadBackupFile(
            self,
            backup_id: str,
    ):
        return self.backup.downloadBackupFile(
            backup_id
        )

    def listBackups(
            self,
    ):
        return self.backup.listBackups()

    # =====================================================
    # Algorithms
    # =====================================================

    def recommendFriends(
            self,
            node_id: str,
            top_k: int = 10,
            graph_id: str | None = None,
    ):
        return self.algorithms.recommendFriends(
            node_id,
            top_k,
            graph_id
        )

    def recommendFriendsWithDetails(
            self,
            node_id,
            top_k=10,
            graph_id=None,
    ):
        return self.algorithms.recommendFriendsWithDetails(
            node_id,
            top_k,
            graph_id
        )

    def create_simulation_engine(
            self,
            graph_id: str | None = None,
    ):
        return self.algorithms.create_simulation_engine(
            graph_id
        )

    def createInfluenceMaximizer(
            self,
            graph_id=None,
    ):
        return (
            self.algorithms
            .createInfluenceMaximizer(
                graph_id
            )
        )

    def commonNeighbors(
            self,
            source_id: str,
            target_id: str,
            graph_id: str | None = None,
    ):
        return self.algorithms.commonNeighbors(
            source_id,
            target_id,
            graph_id,
        )

    def shortestPath(
            self,
            source_id: str,
            target_id: str,
            graph_id: str | None = None,
    ):
        return self.algorithms.shortestPath(
            source_id,
            target_id,
            graph_id,
        )

    def applyLayout(
            self,
            algorithm: str,
            params=None,
            graph_id=None,
    ):
        return self.layout.apply_layout(
            algorithm,
            params,
            graph_id,
        )

    def detectCommunities(
            self,
            config,
            graph_id=None,
    ):
        return (
            self.algorithms
            .detectCommunities(
                config,
                graph_id,
            )
        )

    def execute_plan(
            self,
            plan: dict,
            graph_id=None,
    ):
        return (
            self.query.execute_plan(
                plan,
                graph_id
            )
        )