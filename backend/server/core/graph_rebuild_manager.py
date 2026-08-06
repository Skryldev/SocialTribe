from logger_config import (
    get_logger,
)
from schemas.graph_view import (
    GraphData,
)

from core.exceptions import (
    GraphBuildError,
)

from algorithms.centrality import CentralityAnalyzer
from utils.network_metrics import calculate_average_distance
from analyze.edge_weight import ProfessionalEdgeWeightCalculator
from utils.social_layout import SmartGraphLayout


logger = get_logger(__name__)


class GraphRebuildManager:

    def __init__(
            self,
            graph_service ,
    ):
        self.graph = graph_service


    # =====================================================
    # Internal
    # =====================================================

    def _build_graph_data(
            self,
            graph_id=None,
    ) -> GraphData:
        try:

            # Collect the current graph state into a single object
            # used by export and layout operations.

            return GraphData(
                nodes=self.graph.repository.get_nodes(
                    graph_id
                ),
                edges=self.graph.repository.get_edges(
                    graph_id
                ),
            )

        except Exception as e:
            logger.exception(
                "Failed to build GraphData"
            )

            raise GraphBuildError(
                "Failed to build graph data.",
                graph_id=graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    def _rebuild_spatial_index(
            self,
            graph_id: str | None = None,
    ):

        logger.info(
            "Rebuilding spatial index for graph %s",
            graph_id,
        )

        nodes = self.graph.repository.get_nodes(
            graph_id
        )

        # Rebuild the spatial index from scratch to keep it
        # synchronized with the latest node positions.

        self.graph.spatialIndex.clear()

        self.graph.spatialIndex.buildIndex(
            nodes,
            cellSize=500.0,
        )

        logger.debug(
            "Spatial index rebuilt"
        )

    def _ensure_analysis_complete(
            self,
            graph_id: str,
    ):
        logger.debug(
            "Analysis manager disabled. "
            "No pending analysis."
        )

        return

    def rebuild_graph_metadata(
            self,
            graph_id=None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        try:
            logger.info(
                "Rebuilding graph metadata for graph %s",
                gid,
            )

            # Recalculate graph metrics used by node metadata.

            analyzer = (
                CentralityAnalyzer(
                    self.graph.repository,
                    gid,
                )
            )

            centralities = (
                analyzer
                .compute_all_centralities()
            )

            avg_distances = (
                calculate_average_distance(
                    self.graph.repository,
                    gid,
                )
            )

            nodes = (
                self.graph.repository.get_nodes(
                    gid
                )
            )

            # Update each node with the latest computed metrics.

            for node in nodes:

                node.data.friendCount = (
                    self.graph.repository.degree(
                        node.id,
                        gid,
                    )
                )

                node.data.avgDistance = (
                    avg_distances.get(
                        node.id,
                        0.0,
                    )
                )

                if node.id in centralities:
                    score = (
                        centralities[
                            node.id
                        ]
                    )

                    node.data.centrality = (
                        score.overall
                    )

                    node.data.role = (
                        score.role
                    )

                self.graph.repository.update_node(
                    node,
                    gid,
                )

            logger.info(
                "Metadata rebuild finished for graph %s",
                gid,
            )
        except Exception as e:
            logger.exception(
                "Metadata rebuild failed"
            )

            raise GraphBuildError(
                "Failed to rebuild metadata.",
                graph_id=gid,
                details={
                    "reason": str(e),
                },
            ) from e

    def rebuild_edge_weights(
            self,
            graph_id=None,
    ):
        try:
            logger.info(
                "Rebuilding edge weights for graph %s",
                graph_id,
            )

            # Recompute edge weights based on the current graph structure.

            calculator = (
                ProfessionalEdgeWeightCalculator(
                    self.graph.repository,
                    graph_id,
                )
            )
            calculator.apply_weights()

        except Exception as e:
            logger.exception(
                "Edge weight rebuild failed"
            )

            raise GraphBuildError(
                "Failed to rebuild edge weights.",
                graph_id=graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    def rebuild_layout(
            self,
            graph_id=None,
    ):

        logger.info(
            "Rebuilding layout for graph %s",
            graph_id,
        )

        # Build a fresh graph snapshot before recalculating node positions.

        graph = self._build_graph_data(
            graph_id
        )

        # Apply the automatic layout algorithm.

        graph = (
            SmartGraphLayout
            .apply(
                graph
            )
        )

        nodes = graph.nodes

        # Persist the new node positions returned by the layout engine.

        for node in nodes:
            self.graph.repository.update_node(
                node,
                graph_id,
            )

        self._rebuild_spatial_index(
            graph_id
        )

        logger.info(
            "Layout rebuild completed"
        )

    def rebuild_graph(
            self,
            graph_id=None,
            priority_nodes=None,
    ):

        logger.debug(
            "Rebuilding graph %s",
            graph_id,
        )

        # Refresh all derived graph data after structural changes.

        self.rebuild_graph_metadata(
            graph_id,
        )

        self.rebuild_edge_weights(
            graph_id,
        )

    def rebuild_dataset_import(
            self,
            graph_id=None,
    ):

        self.rebuild_graph(
            graph_id
        )

        self.rebuild_layout(
            graph_id
        )
