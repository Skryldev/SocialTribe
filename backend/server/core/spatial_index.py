from schemas.graph_view import (
    Node,
    Edge,
)
from schemas.spatial import SpatialNode
from threading import RLock
from typing import Dict, List
from logger_config import (
    get_logger,
)

from core.exceptions import (
    SpatialQueryError,
    SpatialUpdateError,
)

logger = get_logger(__name__)


# ─────────────────────────────────────────────
# Spatial Index
# ─────────────────────────────────────────────

# 🔥 Fixed cell size used CONSISTENTLY across all operations.
#    Previously insert/update used 500.0 while queryViewport used 500.0/zoom.
#    This mismatch caused nodes to be stored in different cells than queried.
DEFAULT_CELL_SIZE = 500.0


class SpatialIndex:

    def __init__(self):
        self.quadtree: Dict[str, List[SpatialNode]] = {}
        self.edgeMap: Dict[str, Dict[str, bool]] = {}
        self.mu = RLock()

    # -----------------------------------------------------
    # Helpers
    # -----------------------------------------------------

    def getCellKey(
            self,
            x: float,
            y: float,
            cellSize: float = DEFAULT_CELL_SIZE,
    ) -> str:
        """Compute a deterministic cell key for a point."""
        cx = int(x // cellSize)
        cy = int(y // cellSize)
        return f"{cx},{cy}"

    # -----------------------------------------------------
    # Build
    # -----------------------------------------------------

    def buildIndex(
            self,
            nodes: List[Node],
            cellSize: float = DEFAULT_CELL_SIZE,
    ):
        if cellSize <= 0:
            raise SpatialUpdateError(
                "cellSize must be positive.",
                details={"cellSize": cellSize},
            )

        logger.debug(
            "Building spatial index for %d nodes (cellSize=%s)",
            len(nodes),
            cellSize,
        )

        with self.mu:
            self.quadtree = {}

            # Group nodes into fixed-size spatial cells.

            for node in nodes:
                key = self.getCellKey(
                    node.position.x,
                    node.position.y,
                    cellSize,
                )

                self.quadtree.setdefault(key, []).append(
                    SpatialNode(
                        id=node.id,
                        x=node.position.x,
                        y=node.position.y,
                    )
                )

        logger.debug(
            "Spatial index built (%d cells)",
            len(self.quadtree),
        )

    # -----------------------------------------------------
    # Incremental Updates
    # -----------------------------------------------------

    def insert(
            self,
            node: Node,
            cellSize: float = DEFAULT_CELL_SIZE,
    ):
        if cellSize <= 0:
            raise SpatialUpdateError("cellSize must be positive.")

        with self.mu:
            key = self.getCellKey(
                node.position.x,
                node.position.y,
                cellSize,
            )

            self.quadtree.setdefault(key, []).append(
                SpatialNode(
                    id=node.id,
                    x=node.position.x,
                    y=node.position.y,
                )
            )

        logger.debug("Inserted node %s into spatial index", node.id)

    def remove(self, node_id: str):
        with self.mu:
            for key, nodes in self.quadtree.items():
                for i, node in enumerate(nodes):
                    if node.id == node_id:
                        del nodes[i]
                        logger.debug(
                            "Removed node %s from spatial index",
                            node_id,
                        )
                        return

        logger.debug("Node %s not found in spatial index", node_id)

    def update(
            self,
            node: Node,
            cellSize: float = DEFAULT_CELL_SIZE,
    ):
        """Move a node to its new cell (remove from old, insert into new)."""
        with self.mu:

            # Reinsert the node so it moves to the correct spatial cell.

            self.remove(node.id)
            self.insert(node, cellSize)

    def clear(self):
        with self.mu:
            self.quadtree.clear()
        logger.debug("Spatial index cleared")

    # -----------------------------------------------------
    # Viewport Query
    # -----------------------------------------------------

    def queryViewport(
            self,
            x: float,
            y: float,
            width: float,
            height: float,
            zoom: float,
    ) -> List[str]:
        """
        Return IDs of all nodes within the given viewport rectangle.

        Uses a FIXED cell size (DEFAULT_CELL_SIZE) so that the cell grid
        matches the one used by insert/update/buildIndex, regardless of zoom.
        The zoom parameter is accepted for API compatibility but no longer
        changes the cell size.
        """

        if width <= 0 or height <= 0:
            raise SpatialQueryError(
                "Invalid viewport size.",
                details={"width": width, "height": height},
            )

        logger.debug(
            "Viewport query x=%s y=%s w=%s h=%s zoom=%s (cellSize=%s)",
            x, y, width, height, zoom, DEFAULT_CELL_SIZE,
        )

        with self.mu:
            # 🔥 FIX: Use the same fixed cell size as insert/update/buildIndex.
            # Previously: cellSize = 500.0 / zoom  → mismatch with insert's 500.0
            cellSize = DEFAULT_CELL_SIZE

            startX = x
            startY = y
            endX = x + width
            endY = y + height

            # Collect every spatial cell intersecting the viewport.
            keys = set()
            cx = startX
            while cx <= endX:
                cy = startY
                while cy <= endY:
                    keys.add(self.getCellKey(cx, cy, cellSize))
                    cy += cellSize
                cx += cellSize

            # Gather nodes that fall inside the viewport bounds
            result: List[str] = []
            for key in keys:
                for node in self.quadtree.get(key, []):
                    if startX <= node.x <= endX and startY <= node.y <= endY:
                        result.append(node.id)

            logger.debug("Viewport returned %d nodes", len(result))
            return result

    # -----------------------------------------------------
    # Visible Edges
    # -----------------------------------------------------

    def getEdgesForNodes(
            self,
            node_ids: List[str],
            edges: List[Edge],
    ) -> List[Edge]:
        """Return edges where both source and target are in node_ids."""
        with self.mu:
            nodeSet = set(node_ids)
            result = [
                e
                for e in edges
                if e.source in nodeSet and e.target in nodeSet
            ]

        logger.debug("Found %d visible edges", len(result))
        return result