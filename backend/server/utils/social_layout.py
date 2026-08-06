import math
from collections import defaultdict

from schemas.graph_view import GraphData
from logger_config import (
    get_logger,
)

from core.exceptions import (
    LayoutError,
)

logger = get_logger(__name__)

class SmartGraphLayout:

    COMPONENT_DISTANCE = 2500

    ROLE_RADIUS = {
        "hub": 0,
        "influencer": 250,
        "normal": 500,
        "bridge": 800,
        "isolated": 1200,
    }

    VIEWPORT_WIDTH = 2330.0
    VIEWPORT_HEIGHT = 1195.0
    VIEWPORT_PADDING = 80.0

    TARGET_MIN_VISIBLE_NODES = 8
    TARGET_MAX_VISIBLE_NODES = 50

    MAX_DOWNSCALE = 0.85
    MAX_UPSCALE = 2.0

    @classmethod
    def _normalize_graph(cls, graph: GraphData):
        """
        Normalize node positions so the whole graph fits
        inside the frontend viewport.
        """

        if not graph.nodes:
            return

        xs = [
            node.position.x
            for node in graph.nodes
        ]

        ys = [
            node.position.y
            for node in graph.nodes
        ]

        min_x = min(xs)
        max_x = max(xs)

        min_y = min(ys)
        max_y = max(ys)

        width = max(
            max_x - min_x,
            1.0,
        )

        height = max(
            max_y - min_y,
            1.0,
        )

        available_width = max(
            cls.VIEWPORT_WIDTH
            - cls.VIEWPORT_PADDING * 2,
            1.0,
        )

        available_height = max(
            cls.VIEWPORT_HEIGHT
            - cls.VIEWPORT_PADDING * 2,
            1.0,
        )

        # Scale the layout to fit within the available viewport.

        node_count = len(graph.nodes)

        fit_scale = min(
            available_width / width,
            available_height / height,
        )

        if node_count <= cls.TARGET_MIN_VISIBLE_NODES:

            scale = min(
                fit_scale,
                cls.MAX_UPSCALE,
            )

        elif node_count <= cls.TARGET_MAX_VISIBLE_NODES:

            scale = min(
                fit_scale,
                1.0,
            )

        else:

            overflow = (
                    node_count
                    / cls.TARGET_MAX_VISIBLE_NODES
            )

            scale = max(
                fit_scale / math.sqrt(overflow),
                cls.MAX_DOWNSCALE,
            )

        center_x = (
                           min_x + max_x
                   ) / 2

        center_y = (
                           min_y + max_y
                   ) / 2

        for node in graph.nodes:
            node.position.x = (
                                      node.position.x
                                      - center_x
                              ) * scale

            node.position.y = (
                                      node.position.y
                                      - center_y
                              ) * scale

    @classmethod
    def apply(cls, graph: GraphData) -> GraphData:

        try:
            logger.info(
                "Building graph layout"
            )

            components = cls._find_components(graph)

            # Arrange disconnected graph components on a regular grid.

            for component_index, component_nodes in enumerate(components):
                center_x = (
                                   component_index % 5
                           ) * cls.COMPONENT_DISTANCE

                center_y = (
                                   component_index // 5
                           ) * cls.COMPONENT_DISTANCE

                cls._layout_component(
                    graph,
                    component_nodes,
                    center_x,
                    center_y
                )

            cls._normalize_graph(graph)

            logger.info(
                "Layout generated "
                "(%d components)",
                len(components),
            )

            return graph

        except Exception as e:
            logger.exception(
                "Layout generation failed"
            )

            raise LayoutError(
                "Failed to generate layout.",
                details={
                    "reason": str(e),
                },
            ) from e

    @classmethod
    def _layout_component(
        cls,
        graph,
        component_nodes,
        center_x,
        center_y
    ):

        logger.debug(
            "Layout component "
            "nodes=%d",
            len(component_nodes),
        )

        role_groups = defaultdict(list)

        for node in component_nodes:
            role = node.data.role
            role_groups[role].append(node)

        # Position nodes according to their assigned social role.

        for role, nodes in role_groups.items():

            base_radius = cls.ROLE_RADIUS.get(role, 500)

            density_scale = max(
                1.0,
                math.sqrt(len(nodes) / 12),
            )

            radius = base_radius * density_scale

            count = len(nodes)

            if radius == 0:
                for i, node in enumerate(nodes):
                    angle = (2 * math.pi * i) / max(len(nodes), 1)
                    node.position.x = center_x + 50 * math.cos(angle)
                    node.position.y = center_y + 50 * math.sin(angle)

                node = nodes[0]

                node.position.x = center_x
                node.position.y = center_y

                continue

            for i, node in enumerate(nodes):

                angle = (
                    2 * math.pi * i
                ) / max(count, 1)

                node.position.x = (
                    center_x +
                    radius * math.cos(angle)
                )

                node.position.y = (
                    center_y +
                    radius * math.sin(angle)
                )


    @staticmethod
    def _find_components(graph: GraphData):
        logger.debug(
            "Finding connected components"
        )
        node_map = {
            n.id: n
            for n in graph.nodes
        }

        adj = {
            n.id: set()
            for n in graph.nodes
        }

        # Build an undirected adjacency map for component detection.

        for edge in graph.edges:

            adj[edge.source].add(
                edge.target
            )

            adj[edge.target].add(
                edge.source
            )

        visited = set()

        components = []

        for node_id in adj:

            if node_id in visited:
                continue

            stack = [node_id]

            component = []

            visited.add(node_id)

            # Explore the entire connected component using depth-first traversal.

            while stack:

                current = stack.pop()

                component.append(
                    node_map[current]
                )

                for neighbor in adj[current]:

                    if neighbor not in visited:

                        visited.add(
                            neighbor
                        )

                        stack.append(
                            neighbor
                        )

            components.append(component)

        logger.debug(
            "Found %d components",
            len(components),
        )

        return components