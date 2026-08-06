class SkipOperator:

    def execute(
            self,
            node,
            executor,
            stats,
            graph_id,
    ):

        # Execute the input pipeline before skipping rows.

        rows = executor.walk(
            node=node["input"],
            stats=stats,
            graph_id=graph_id,
        )

        skip = node.get(
            "skip",
            0,
        )

        if skip <= 0:
            return rows

        # Discard the requested number of leading rows.

        return rows[skip:]