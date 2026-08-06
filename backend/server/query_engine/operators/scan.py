from schemas.graph_view import Node
from query_engine.query_repository import QueryRepository


class ScanOperator:

    def __init__(
            self,
            datasource: QueryRepository,
    ):
        self.datasource = datasource

    # =====================================================
    # Table Scan
    # =====================================================

    def execute(
            self,
            node,
            executor,
            stats,
            graph_id,
    ):

        # Load all graph nodes that participate in the query.

        rows = self.datasource.scan_nodes(graph_id)

        stats["scanned"] = len(rows)

        # Convert repository models into query rows.

        return [
            self._node_to_row(n)
            for n in rows
        ]

    # =====================================================
    # Helper
    # =====================================================

    def _node_to_row(
            self,
            node: Node,
    ) -> dict:

        # Serialize the node using the available model interface.

        if hasattr(node,"model_dump"):

            return node.model_dump()

        if hasattr(node,"dict"):

            return node.dict()

        return dict(node)