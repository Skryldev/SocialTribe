import re


class QueryHelpers:

    # =====================================================
    # Value
    # =====================================================

    @staticmethod
    def get(
            row,
            prop,
    ):

        if row is None:
            return None

        #
        # dotted path
        #

        # Resolve nested property paths before attempting direct lookups.

        if "." in prop:

            current = row

            for part in prop.split("."):

                if (
                        not isinstance(current, dict)
                        or
                        part not in current
                ):
                    current = None
                    break

                current = current[part]

            if current is not None:
                return current

        #
        # direct lookup
        #

        if prop in row:
            return row[prop]

        # Check common query aliases before performing a recursive search.

        for key in (
                "u",
                "v",
                "e",
                "n",
                "s",
                "t",
                "center",
                "neighbor",
                "n2",
                "u1",
                "u2",
        ):

            obj = row.get(key)

            if (
                    isinstance(obj, dict)
                    and
                    prop in obj
            ):
                return obj[prop]

        for obj in row.values():

            if isinstance(obj, dict):

                value = QueryHelpers.get(obj, prop)

                if value is not None:
                    return value

        return None

    # =====================================================
    # Compare
    # =====================================================

    @staticmethod
    def compare(
            left,
            operator,
            right,
    ):

        match operator:

            case "GreaterThan":
                return left > right

            case "LessThan":
                return left < right

            case "Equals":
                return left == right

            case "NotEquals":
                return left != right

            case "GreaterThanOrEqual":
                return left >= right

            case "LessThanOrEqual":
                return left <= right

        return False

    # =====================================================
    # Condition
    # =====================================================

    @staticmethod
    def test_condition(
            row,
            condition
    ):

        value = QueryHelpers.get(row, condition["property"])

        if value is None:
            return False

        return QueryHelpers.compare(
            value,
            condition["operator"],
            condition["value"],
        )

    # =====================================================
    # Predicate
    # =====================================================

    @staticmethod
    def extract_conditions(
            predicate,
    ):

        # Extract comparison components from the serialized predicate.

        props = [
            m[1]
            for m in re.finditer(
                r'property:\s*"([^"]+)"', predicate
            )
        ]

        ops = [
            m[1]
            for m in re.finditer(
                r'operator:\s*(\w+)', predicate
            )

            if m[1] not in ("And", "Or")
        ]

        values = []

        for m in re.finditer(
                r'Integer\((\d+)\)|'
                r'Float\(([\d.]+)\)|'
                r'String\("([^"]*)"\)',
                predicate,
        ):

            if m[1]:
                values.append(int(m[1]))
            elif m[2]:
                values.append(float(m[2]))
            else:
                values.append(m[3])

        limit = min(
            len(props),
            len(ops),
            len(values),
        )

        return [
            {
                "property": props[i],
                "operator": ops[i],
                "value": values[i],
            }
            for i in range(limit)
        ]

    # =====================================================
    # Projection
    # =====================================================

    @staticmethod
    def evaluate_projection(
            row: dict,
            projection: dict,
    ):

        #
        # Literal
        #

        if "literal" in projection:
            return projection["literal"]

        #
        # Property
        #

        if "property" in projection:
            return QueryHelpers.get(row, projection["property"])

        #
        # Function
        #

        if "function" in projection:
            raise NotImplementedError(
                projection["function"]
            )

        #
        # Expression
        #

        if "expression" in projection:
            raise NotImplementedError(
                "Expression evaluation "
                "not implemented."
            )

        return None

    # =====================================================
    # Sort
    # =====================================================

    @staticmethod
    def sort_value(
            row: dict,
            sort: dict,
    ):

        if sort.get("property"):
            return QueryHelpers.get(row, sort["property"])

        if sort.get("expression"):
            raise NotImplementedError(
                "Sort expression is not implemented."
            )

        return None

    @staticmethod
    def sort_reverse(
            sort: dict,
    ) -> bool:

        direction = sort.get("direction", "ASC")

        return direction.upper() == "DESC"

    # =====================================================
    # Aggregate
    # =====================================================

    @staticmethod
    def compute_agg(
            func,
            prop,
            rows,
    ):

        # Collect numeric values eligible for aggregation.

        values = [

            QueryHelpers.get(row, prop)

            for row in rows

            if isinstance(
                QueryHelpers.get(row, prop, ), (int, float,)
            )
        ]

        values = [

            value

            for value in values

            if value is not None
        ]

        func = func.upper()

        if func == "COUNT":
            return len(rows)

        if func == "SUM":
            return sum(values) if values else 0

        if func == "AVG":
            return (
                sum(values) / len(values)
                if values
                else 0
            )

        if func == "MIN":
            return (
                min(values)
                if values
                else 0
            )

        if func == "MAX":
            return (
                max(values)
                if values
                else 0
            )

        return len(rows)
