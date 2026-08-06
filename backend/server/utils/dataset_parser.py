from datetime import datetime, UTC
from collections import deque
import secrets
import string
import time

from schemas.graph_view import (
    GraphData,
    Node,
    Edge,
    Position,
)
from logger_config import (
    get_logger,
)

from core.exceptions import (
    DatasetParseError,
)

logger = get_logger(__name__)


ALPHABET = string.ascii_lowercase + string.digits


def short_id(prefix: str = "", size: int = 12) -> str:
    """
    Generates compact ID with high entropy.
    size=12 → ~60 bits entropy
    """
    chars = []

    # Combine random and time-based entropy to reduce identifier collisions.
    seed = secrets.randbits(64) ^ int(time.time_ns())

    for _ in range(size):
        seed, idx = divmod(seed, len(ALPHABET))
        chars.append(ALPHABET[idx])

    return prefix + ''.join(chars)


class DatasetParser:

    # ==========================================================
    # ID GENERATION
    # ==========================================================

    @staticmethod
    def generate_node_id() -> str:
        # max length: n_ + 12 = 14 chars
        return "n_" + short_id(size=12)

    @staticmethod
    def generate_edge_id() -> str:
        # max length: e_ + 12 = 14 chars
        return "e_" + short_id(size=12)

    @classmethod
    def parse_network_json(
            cls,
            data: dict,
    ) -> GraphData:

        nodes = []
        edges = []

        # Maps old node ids from the imported file
        # to newly generated ids.
        old_to_new_node_ids = {}

        # ==========================================================
        # NODES
        # ==========================================================

        for item in data["nodes"]:
            old_node_id = item["id"]
            new_node_id = cls.generate_node_id()

            old_to_new_node_ids[old_node_id] = new_node_id

            node_data = dict(item.get("data", {}))
            node_data["id"] = new_node_id

            nodes.append(
                Node(
                    id=new_node_id,
                    type=item.get(
                        "type",
                        "socialUser",
                    ),
                    position=Position(
                        x=0,
                        y=0,
                    ),
                    data=node_data or {
                        "id": new_node_id,
                        "name": old_node_id,
                        "nodeType": "socialUser",
                        "role": "normal",
                        "friendCount": 0,
                        "avgDistance": 0.0,
                        "centrality": 0.0,
                    },
                )
            )

        # ==========================================================
        # EDGES
        # ==========================================================

        for item in data["edges"]:
            new_edge_id = cls.generate_edge_id()

            source = old_to_new_node_ids[item["source"]]
            target = old_to_new_node_ids[item["target"]]

            weight = (
                    item.get("weight")
                    or item.get("data", {}).get("Weight", 50)
            )

            edges.append(
                Edge(
                    id=new_edge_id,
                    source=source,
                    target=target,
                    type=item.get(
                        "type",
                        "weightedEdge",
                    ),
                    data={
                        "id": new_edge_id,
                        "Weight": weight,
                        "createdAt": datetime.now(UTC).isoformat(),
                        "sourceId": source,
                        "targetId": target,
                    },
                )
            )

        return GraphData(
            nodes=nodes,
            edges=edges,
        )

    # ==========================================================
    # GRAPH COMPONENTS
    # ==========================================================

    @staticmethod
    def find_components(adj: dict):

        visited = set()
        components = []

        for node in adj:
            if node in visited:
                continue

            component = []
            queue = deque([node])
            visited.add(node)

            while queue:
                current = queue.popleft()
                component.append(current)

                for neighbor in adj[current]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            components.append(component)

        return components

    # ==========================================================
    # PARSER
    # ==========================================================

    @classmethod
    def parse(cls, content: str | dict) -> GraphData:
        try:
            logger.info(
                "Parsing dataset"
            )

            if isinstance(content, dict):
                return cls.parse_network_json(content)

            lines = [
                line.strip()
                for line in content.splitlines()
                if line.strip()
            ]

            usernames = set()
            relations = []

            # Collect unique users and their relationships from the input.

            for line in lines:
                parts = line.split()
                if len(parts) < 2:
                    continue

                source_name = parts[0]
                target_name = parts[1]

                usernames.add(source_name)
                usernames.add(target_name)

                relations.append((source_name, target_name))

            usernames = sorted(usernames)

            name_to_id = {}
            nodes = []

            # ======================================================
            # NODES
            # ======================================================

            # Assign stable internal identifiers to every discovered user.

            for username in usernames:
                node_id = cls.generate_node_id()
                name_to_id[username] = node_id

                nodes.append(
                    Node(
                        id=node_id,
                        type="socialUser",
                        position=Position(x=0, y=0),
                        data={
                            "id": node_id,
                            "name": username,
                            "nodeType": "socialUser",
                            "role": "normal",
                            "friendCount": 0,
                            "avgDistance": 0.0,
                            "centrality": 0.0,
                        }
                    )
                )

            # ======================================================
            # EDGES
            # ======================================================
            edges = []

            # Create graph edges from the parsed relationships.

            for source_name, target_name in relations:
                source_id = name_to_id[source_name]
                target_id = name_to_id[target_name]

                edge_id = cls.generate_edge_id()

                edges.append(
                    Edge(
                        id=edge_id,
                        source=source_id,
                        target=target_id,
                        type="weightedEdge",
                        data={
                            "id": edge_id,
                            "Weight": 50,
                            "createdAt": datetime.now(UTC).isoformat(),
                            "sourceId": source_id,
                            "targetId": target_id,
                        },
                    )
                )

            logger.info(
                "Dataset parsed "
                "nodes=%d "
                "edges=%d",
                len(nodes),
                len(edges),
            )

            return GraphData(
                nodes=nodes,
                edges=edges,
            )
        except Exception as e:
            logger.exception(
                "Dataset parsing failed"
            )

            raise DatasetParseError(
                "Failed to parse dataset.",
                details={
                    "reason": str(e),
                },
            ) from e