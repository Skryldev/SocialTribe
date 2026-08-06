from query_engine.query_helpers import (
    QueryHelpers,
)


class SortOperator:

    def execute(
            self,
            node,
            executor,
            stats,
            graph_id,
    ):

        # Execute the input pipeline before sorting the result set.

        rows = executor.walk(
            node=node["input"],
            stats=stats,
            graph_id=graph_id,
        )

        sorts = node.get(
            "sort",
            [],
        )

        if not sorts:
            return rows

        #
        # Python sort is stable.
        # Sort from last key to first key.
        #

        # Apply sort keys in reverse order to preserve multi-column sorting.
        for sort in reversed(sorts):

            rows.sort(

                key=lambda row:
                    QueryHelpers.sort_value(
                        row,
                        sort,
                    ),

                reverse=QueryHelpers.sort_reverse(
                    sort,
                ),
            )

        return rows