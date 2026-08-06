from query_engine.query_helpers import (
    QueryHelpers,
)


class ProjectOperator:

    # =====================================================
    # Execute
    # =====================================================

    def execute(
            self,
            node,
            executor,
            stats,
            graph_id,
            is_inside_aggregate=False,
    ):

        # Execute the input pipeline before applying projections.

        rows = executor.walk(
            node=node["input"],
            stats=stats,
            graph_id=graph_id,
            is_inside_aggregate=is_inside_aggregate,
        )

        projections = node.get("projections", [])

        if not projections:
            return rows

        output = []

        # Evaluate every projection for each input row.

        for row in rows:

            new_row = {}

            for projection in projections:

                if projection.get("alias"):

                    name = projection["alias"]

                elif projection.get("property"):

                    name = projection["property"]

                elif projection.get("function"):

                    prop = projection.get("property", "*")
                    name = (
                        f"{projection['function']}({prop})"
                    )

                else:

                    name = "value"

                value = QueryHelpers.evaluate_projection(row, projection)

                new_row[name] = value

            output.append(new_row)

        # Automatically perform grouping when aggregate projections are mixed with regular columns.

        if (
                not is_inside_aggregate
                and
                any(
                    self._is_aggregate_projection(projection)
                    for projection in projections
                )
        ):
            output = self.auto_aggregate(output, projections)

        return output

    # =====================================================
    # Helper
    # =====================================================

    def auto_aggregate(
            self,
            rows,
            projections,
    ):

        agg_columns = []

        group_columns = []

        for projection in projections:

            if self._is_aggregate_projection(projection):

                agg_columns.append(projection)

            else:

                group_columns.append(projection)

        if (
                not agg_columns
                or
                not group_columns
        ):
            return rows

        # Group projected rows before computing aggregate values.

        groups = {}

        group_key = group_columns[0]["property"]

        for row in rows:
            key = str(
                QueryHelpers.get(row, group_key) or ""
            )

            groups.setdefault(key, []).append(row)

        result = []

        # Produce one aggregated output row for each group.

        for key, group_rows in groups.items():

            column_name = group_key.split(".")[-1]

            output = {
                column_name: key
            }

            for column in agg_columns:
                func = column["function"]

                prop = column.get("property","*")

                column_name = (
                    f"{func}({prop})"
                )

                output[column_name] = (
                    QueryHelpers.compute_agg(
                        func,
                        prop,
                        group_rows,
                    )
                )

                result.append(output)

        return result

    def _is_aggregate_projection(
            self,
            projection: dict,
    ) -> bool:

        if "function" not in projection:
            return False

        return (
                projection["function"].upper()
                in {
                    "COUNT",
                    "SUM",
                    "AVG",
                    "MIN",
                    "MAX",
                }
        )
