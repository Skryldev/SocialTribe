from logger_config import (
    get_logger,
)
from copy import deepcopy

logger = get_logger(__name__)


class GraphCrudManager:

    def __init__(
            self,
            graph_service ,
    ):
        self.graph = graph_service

    # =====================================================
    # Node CRUD
    # =====================================================

    def addNode(
            self,
            node,
            graph_id: str | None = None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        logger.info(
            "Adding node %s to graph %s",
            node.id,
            gid,
        )

        self.graph.repository.add_node(
            node,
            gid,
        )

        # Preserve the active layout snapshot when the graph changes.

        layout = self.graph.layout_state.get(gid)

        if layout["algorithm"] != "natural":
            self.graph.layout.snapshots.preserve_active_snapshot_after_graph_change(

                graph_id=gid,

                algorithm=layout["algorithm"],

                params=layout["params"],

                repository=self.graph.repository,

            )

        if not self.graph._dataset_importing:
            self.graph.rebuild_graph(gid)

        try:
            self.graph.spatialIndex.insert(
                node,
                cellSize=500.0,
            )
        except Exception:
            logger.exception(
                "Failed to insert node into spatial index"
            )

        return node

    def getNode(
            self,
            node_id: str,
            graph_id: str | None = None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        return self.graph.repository.get_node(
            node_id,
            gid,
        )

    def getNodes(
            self,
            graph_id=None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        return self.graph.repository.get_nodes(
            gid
        )

    def updateNode(
            self,
            node,
            graph_id=None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        layout = self.graph.layout_state.get(gid)

        if layout["algorithm"] != "natural":

            algorithm = layout["algorithm"]
            params = layout["params"]

            # Clone the active layout positions before updating
            # the moved node to create a new snapshot.

            positions = deepcopy(
                self.graph.layout.snapshots.get_active_positions(
                    gid,
                    algorithm,
                    params,
                )
            )

            if positions is None:
                raise RuntimeError(
                    "Active snapshot not found."
                )

            positions[node.id] = {
                "x": node.position.x,
                "y": node.position.y,
            }

            self.graph.layout.snapshots.create_child_snapshot(
                graph_id=gid,
                algorithm=algorithm,
                params=params,
                positions=positions,
            )

            logger.info(
                "Snapshot updated for layout %s",
                algorithm,
            )

            return node

        self.graph.repository.update_node(
            node,
            gid,
        )

        self.graph.rebuild_graph(
            gid,
        )

        try:
            self.graph.spatialIndex.update(
                node,
                cellSize=500.0,
            )
        except Exception:
            logger.exception(
                "Failed to update spatial index"
            )

        return node

    def deleteNode(
            self,
            node_id,
            graph_id: str | None = None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        logger.info(
            "Deleting node %s",
            node_id,
        )

        edges = (
            self.graph.repository.get_edges(
                gid
            )
        )

        affected_nodes = set()

        # Remove all connected edges before deleting the node.

        for edge in edges:
            if (
                    edge.source == node_id
                    or
                    edge.target == node_id
            ):
                affected_nodes.add(
                    edge.source
                )

                affected_nodes.add(
                    edge.target
                )

                self.graph.repository.delete_edge(
                    edge.id,
                    gid,
                )

        self.graph.repository.delete_node(
            node_id,
            gid,
        )

        layout = self.graph.layout_state.get(gid)

        if layout["algorithm"] != "natural":
            self.graph.layout.snapshots.preserve_active_snapshot_after_graph_change(

                graph_id=gid,

                algorithm=layout["algorithm"],

                params=layout["params"],

                repository=self.graph.repository,

            )

        self.graph.repository.clear_cache()

        self.graph.spatialIndex.remove(
            node_id
        )

        self.graph.rebuild_graph(
            gid,
        )

        logger.info(
            "Node %s deleted",
            node_id,
        )

        return True

    # =====================================================
    # Edge CRUD
    # =====================================================

    def addEdge(
            self,
            edge,
            graph_id=None,
    ):

        logger.info(
            "Adding edge %s",
            edge.id,
        )

        gid = self.graph.repository._graph_id(
            graph_id
        )

        self.graph.repository.add_edge(
            edge,
            gid,
        )

        layout = self.graph.layout_state.get(gid)

        if layout["algorithm"] != "natural":
            self.graph.layout.snapshots.preserve_active_snapshot_after_graph_change(

                graph_id=gid,

                algorithm=layout["algorithm"],

                params=layout["params"],

                repository=self.graph.repository,

            )

        if not self.graph._dataset_importing:
            self.graph.rebuild_graph(gid)

        return edge

    def getEdge(
            self,
            edge_id,
            graph_id: str | None = None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        return self.graph.repository.get_edge(
            edge_id,
            gid,
        )

    def getEdges(
            self,
            graph_id=None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        return self.graph.repository.get_edges(
            gid
        )

    def updateEdge(
            self,
            edge,
    ):
        gid = (
            self.graph.repository
            ._graph_id()
        )

        logger.info(
            "Updating edge %s",
            edge.id,
        )

        self.graph.repository.update_edge(
            edge
        )

        return edge

    def deleteEdge(
            self,
            edge_id,
            graph_id=None,
    ):
        gid = self.graph.repository._graph_id(
            graph_id
        )

        logger.info(
            "Deleting edge %s",
            edge_id,
        )

        edge = (
            self.graph.repository.get_edge(
                edge_id,
                gid,
            )
        )

        self.graph.repository.delete_edge(
            edge_id,
            gid,
        )

        layout = self.graph.layout_state.get(gid)

        if layout["algorithm"] != "natural":
            self.graph.layout.snapshots.preserve_active_snapshot_after_graph_change(

                graph_id=gid,

                algorithm=layout["algorithm"],

                params=layout["params"],

                repository=self.graph.repository,

            )

        self.graph.repository.clear_cache()

        # Rebuild graph metadata only when an existing edge
        # was actually removed.

        if edge:
            self.graph.rebuild_graph(
                gid,
            )

        logger.info(
            "Edge %s deleted",
            edge_id,
        )

        return True
