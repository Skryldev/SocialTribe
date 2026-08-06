import re

from query_engine.query_helpers import (
    QueryHelpers,
)


class FilterOperator:

    def execute(
            self,
            node: dict,
            executor,
            stats: dict,
            graph_id
    ):

        # Execute the input pipeline before applying the filter.

        input_rows = executor.walk(
            node=node["input"],
            stats=stats,
            graph_id=graph_id,
        )

        before = len(input_rows)

        rows = self.apply_filter(
            input_rows,
            node.get(
                "predicate",
                "",
            ),
        )

        stats["filtered"] += before - len(rows)

        return rows

    # =====================================================
    # Filter Engine
    # =====================================================

    def apply_filter(
            self,
            rows,
            predicate,
    ):

        # Choose the filtering strategy based on the predicate structure.

        if re.search(
                r"\boperator:\s*(And|Or)\b", predicate
        ):
            return self.compound_filter(
                rows, predicate
            )

        return self.simple_filter(
            rows, predicate
        )

    def compound_filter(
            self,
            rows,
            predicate,
    ):

        # Parse the individual conditions from the compound predicate.

        conditions = QueryHelpers.extract_conditions(predicate)

        operators = [
            m[1]
            for m in re.finditer(
                r"operator:\s*(And|Or)",
                predicate
            )
        ]

        if not conditions:
            return rows

        result = []

        for row in rows:

            ok = QueryHelpers.test_condition(row, conditions[0])

            for i in range(len(operators)):

                if operators[i] == "And":

                    ok = (
                            ok
                            and
                            QueryHelpers.test_condition(row, conditions[i + 1])
                    )

                else:

                    ok = (
                            ok
                            or
                            QueryHelpers.test_condition(row,conditions[i + 1])
                    )

            if ok:
                result.append(row)

        return result

    def simple_filter(
            self,
            rows,
            predicate,
    ):

        # Extract the comparison operands from the serialized predicate.

        property_match = re.search(
            r'property:\s*"([^"]+)"', predicate
        )

        operator_match = re.search(
            r'operator:\s*(\w+)', predicate
        )

        value_match = re.search(
            r'Integer\((\d+)\)|'
            r'Float\(([\d.]+)\)|'
            r'String\("([^"]*)"\)',
            predicate,
        )

        if (
                not property_match
                or
                not operator_match
                or
                not value_match
        ):
            return rows

        prop = property_match.group(1)

        op = operator_match.group(1)

        if value_match.group(1):
            value = int(value_match.group(1))

        elif value_match.group(2):
            value = float(value_match.group(2))

        else:
            value = value_match.group(3)

        return [
            row
            for row in rows
            if (
                    QueryHelpers.get(row, prop) is not None
                    and
                    QueryHelpers.compare(
                        QueryHelpers.get(row, prop),
                        op,
                        value,
                    )
            )
        ]
