class LimitOperator:

    def execute(
            self,
            node,
            executor,
            stats,
            graph_id,
    ):

        # Execute the input pipeline before applying the row limit.

        rows = executor.walk(
            node=node["input"],
            stats=stats,
            graph_id=graph_id,
        )

        limit = node.get(
            "limit",
        )

        if (
                limit is None
                or
                limit < 0
        ):
            return rows

        # Return only the requested number of rows.

        return rows[:limit]