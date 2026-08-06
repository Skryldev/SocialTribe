from query_engine.query_repository import QueryRepository


class ExpandOperator:

    def __init__(
            self,
            datasource: QueryRepository,
    ):
        self.datasource = datasource

    def execute(
            self,
            node,
            executor,
            stats,
            graph_id
    ):

        # Execute the input pipeline before expanding graph relationships.

        input_rows = executor.walk(
            node["input"],
            stats,
            graph_id
        )

        # Expand every input row with its neighboring nodes and edges.

        rows = self.datasource.expand(input_rows)

        stats["traversed"] += len(rows)

        return rows
