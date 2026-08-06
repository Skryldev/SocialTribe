from storage_engine.repository import (
    GraphRepository
)
from logger_config import get_logger

logger = get_logger(__name__)


class LayoutRepository:

    def __init__(
            self,
            repository: GraphRepository,
            graph_id: str | None = None,
    ):
        self.repository = repository

        # Resolve the graph identifier used by all layout queries.

        self.graph_id = (
            repository._graph_id(
                graph_id
            )
        )

        logger.debug(
            "LayoutRepository initialized "
            "graph=%s",
            self.graph_id,
        )

    # -----------------------------------
    # Nodes
    # -----------------------------------

    def node_ids(self):

        # Retrieve all node identifiers for the active graph.

        return (
            self.repository
            .get_node_ids(
                self.graph_id
            )
        )

    def nodes(
            self,
            node_ids: list[str],
    ):
        return (
            self.repository
            .get_nodes_bulk(
                node_ids,
                self.graph_id,
            )
        )

    # -----------------------------------
    # Degree
    # -----------------------------------

    def degree(
            self,
            node_id: str,
    ):
        return (
            self.repository
            .degree(
                node_id,
                self.graph_id,
            )
        )

    def degree_batch(
            self,
            node_ids: list[str],
    ):

        # Retrieve node degrees in a single repository call.

        return (
            self.repository
            .degree_batch(
                node_ids,
                self.graph_id,
            )
        )

    # -----------------------------------
    # Neighbors
    # -----------------------------------

    def neighbors(
            self,
            node_id: str,
    ):
        return (
            self.repository
            .neighbors(
                node_id,
                self.graph_id,
            )
        )

    def neighbors_batch(
            self,
            node_ids: list[str],
    ):
        return (
            self.repository
            .neighbors_batch(
                node_ids,
                self.graph_id,
            )
        )

    def neighbors_with_weights(
            self,
            node_id: str,
    ):
        return (
            self.repository
            .neighbors_with_weights(
                node_id,
                self.graph_id,
            )
        )

    # -----------------------------------
    # Positions
    # -----------------------------------

    def positions(
            self,
            node_ids: list[str],
    ):
        nodes = self.nodes(
            node_ids
        )

        return {
            node.id: {
                "x":
                    node.position.x,

                "y":
                    node.position.y,
            }
            for node
            in nodes.values()
        }