from logger_config import (
    get_logger,
)

from core.exceptions import (
    ViewportError,
)

logger = get_logger(__name__)


class GraphViewportManager:

    def __init__(
            self,
            graph_service,
    ):
        self.graph = graph_service

    def _viewport_from_storage(
            self,
            x: float,
            y: float,
            width: float,
            height: float,
            zoom: float,
            gid: str,
    ):

        # Query the spatial index to retrieve only the
        # nodes visible inside the current viewport.

        node_ids = (
            self.graph.spatialIndex
            .queryViewport(
                x,
                y,
                width,
                height,
                zoom,
            )
        )

        # Limit graph analysis to the currently visible nodes.

        self.graph.analysis._set_viewport_nodes(
            gid,
            node_ids,
        )

        self.graph._ensure_analysis_complete(
            gid
        )

        nodes = list(
            self.graph.repository
            .get_nodes_bulk(
                node_ids,
                gid,
            )
            .values()
        )

        # Load graph edges to determine which connections
        # belong to the visible nodes.

        graph = (
            self.graph
            ._build_graph_data(
                gid
            )
        )

        edges = (
            self.graph.spatialIndex
            .getEdgesForNodes(
                node_ids,
                graph.edges,
            )
        )
        logger.debug(
            "Viewport returned "
            "%d nodes and %d edges",
            len(nodes),
            len(edges),
        )
        return {
            "nodes": nodes,
            "edges": edges,
        }

    def _viewport_from_snapshot(
            self,
            x: float,
            y: float,
            width: float,
            height: float,
            zoom: float,
            gid: str,
            algorithm: str,
            params: dict,
    ):
        snapshot = (
            self.graph.layout.snapshots
            .get_active_snapshot(
                gid,
                algorithm,
                params,
            )
        )

        if not snapshot:

            logger.debug(
                "No active layout snapshot found. Falling back to storage."
            )

            return self._viewport_from_storage(
                x,
                y,
                width,
                height,
                zoom,
                gid,
            )

        positions = snapshot["positions"]

        end_x = x + width
        end_y = y + height

        visible_ids = []

        position_map = positions

        # Find all cached node positions that fall inside
        # the requested viewport.

        for node_id, pos in positions.items():

            px = pos["x"]
            py = pos["y"]

            if (
                    x <= px <= end_x
                    and
                    y <= py <= end_y
            ):
                visible_ids.append(node_id)

        # Limit graph analysis to the currently visible nodes.

        self.graph.analysis._set_viewport_nodes(
            gid,
            visible_ids,
        )

        self.graph._ensure_analysis_complete(
            gid
        )

        nodes = (
            self.graph.repository
            .get_nodes_bulk(
                visible_ids,
                gid,
            )
        )

        # Replace stored positions with the cached layout positions.

        for node in nodes.values():

            pos = position_map.get(
                node.id
            )

            if pos:
                node.position.x = (
                    pos["x"]
                )

                node.position.y = (
                    pos["y"]
                )

        visible_set = set(
            visible_ids
        )

        edges = []

        # Keep only edges whose endpoints are both visible.

        for edge in (
                self.graph.repository
                        .get_edges(
                    gid
                )
        ):
            if (
                    edge.source
                    in visible_set
                    and
                    edge.target
                    in visible_set
            ):
                edges.append(
                    edge
                )
        logger.debug(
            "Viewport returned "
            "%d nodes and %d edges",
            len(nodes),
            len(edges),
        )
        return {
            "nodes":
                list(
                    nodes.values()
                ),

            "edges":
                edges,
        }

    def getViewport(
            self,
            x: float,
            y: float,
            width: float,
            height: float,
            zoom: float,
    ):
        try:
            logger.debug(
                "Viewport request "
                "x=%s y=%s w=%s h=%s zoom=%s",
                x,
                y,
                width,
                height,
                zoom,
            )

            gid = (
                self.graph.repository
                ._graph_id()
            )

            layout = (
                self.graph.layout_state.get(
                    gid
                )
            )

            algorithm = layout["algorithm"]

            params = layout["params"]

            logger.debug(
                "Current layout=%s",
                layout,
            )

            # Natural layout uses positions stored directly
            # in the repository.

            if algorithm == "natural":
                return (
                    self
                    ._viewport_from_storage(
                        x,
                        y,
                        width,
                        height,
                        zoom,
                        gid,
                    )
                )

            return (
                self
                ._viewport_from_snapshot(
                    x,
                    y,
                    width,
                    height,
                    zoom,
                    gid,
                    algorithm,
                    params,
                )
            )

        except Exception as e:
            logger.exception(
                "Viewport query failed"
            )

            raise ViewportError(
                "Failed to build viewport.",
                details={
                    "reason": str(e),
                },
            ) from e
