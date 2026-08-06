import re

from query_engine.query_helpers import (
    QueryHelpers,
)


class AggregateOperator:

    # =====================================================
    # Execute
    # =====================================================

    def execute(
            self,
            node,
            executor,
            stats,
            graph_id,
    ):

        # Execute the input pipeline before performing aggregation.

        rows = executor.walk(
            node=node["input"],
            stats=stats,
            graph_id=graph_id,
            is_inside_aggregate=True,
        )

        return self.aggregate_rows(
            rows,
            node,
        )

    # =====================================================
    # Aggregate
    # =====================================================

    def aggregate_rows(
            self,
            rows,
            node,
    ):

        group_keys = self.parse_columns(
            node.get("group_keys", [])
        )

        aggregations = [

            self.parse_aggregation(agg)

            for agg in node.get("aggregations", [])
        ]

        # Group rows using the configured grouping keys.

        groups = {}

        for row in rows:
            key = tuple(

                QueryHelpers.get(row, group_key)

                for group_key in group_keys
            )

            groups.setdefault(key, []).append(row)

        result = []

        # Produce one output row for each aggregated group.

        for key, group_rows in groups.items():

            output = {}

            #
            # Group By columns
            #

            for i, group_key in enumerate(group_keys):
                output[group_key.split(".")[-1]] = key[i]

            #
            # Aggregations
            #

            for aggregation in aggregations:
                name = (
                    f"{aggregation['func']}({aggregation['prop']})"
                )

                output[name] = QueryHelpers.compute_agg(
                    aggregation["func"],
                    aggregation["prop"],
                    group_rows,
                )

            result.append(output)

        return result

    # =====================================================
    # Helpers
    # =====================================================

    def parse_columns(
            self,
            columns,
    ):

        result = []

        for column in columns:

            # Extract property names from serialized group-by definitions.

            match = re.search(
                r'property:\s*"([^"]+)"', str(column)
            )

            if match:

                result.append(match[1])

            else:

                result.append(str(column))

        return result

    def parse_aggregation(
            self,
            value,
    ):

        # Parse the aggregation function and target property.

        func = re.search(
            r'name:\s*"(\w+)"',
            value,
            re.I
        )

        prop = re.search(
            r'property:\s*"(\w+)"',
            value,
            re.I
        )

        variable = re.search(
            r'Variable\("(\w+)"\)',value
        )

        return {

            "func":
                func[1] if func else "COUNT",
            "prop":
                prop[1] if prop else (variable[1] if variable else "*")
        }
