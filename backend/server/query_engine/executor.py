from query_engine.operators.scan import ScanOperator
from query_engine.operators.expand import ExpandOperator
from query_engine.operators.filter import FilterOperator
from query_engine.operators.project import ProjectOperator
from query_engine.operators.sort import SortOperator
from query_engine.operators.limit import LimitOperator
from query_engine.operators.skip import SkipOperator
from query_engine.operators.aggregate import AggregateOperator
from schemas.query import QueryResponse, QueryResult, QueryStatistics
import time


class GraphExecutor:

    def __init__(self, datasource):
        self.datasource = datasource

        self.scan = ScanOperator(datasource)
        self.expand = ExpandOperator(datasource)
        self.filter = FilterOperator()
        self.project = ProjectOperator()
        self.sort = SortOperator()
        self.limit = LimitOperator()
        self.skip = SkipOperator()
        self.aggregate = AggregateOperator()

    # -----------------------------------------------------

    def execute(
            self,
            plan,
            graph_id: str,
    ):

        # Track execution statistics collected while processing the query plan.

        stats = {
            "scanned": 0,
            "traversed": 0,
            "filtered": 0,
        }

        start = time.perf_counter()

        # Execute the physical query plan recursively.

        rows = self.walk(
            plan,
            stats,
            graph_id,
            False
        )

        # Infer the output schema from the produced result set.

        columns = (
            list(rows[0].keys()) if rows else []
        )

        stats["ms"] = round(
            (
                    time.perf_counter() - start
            ) * 1000
            ,3
            ,
        )

        return QueryResponse(
            data=QueryResult(
                rows=rows,
                columns=columns,
                statistics=QueryStatistics(
                    **stats,
                ),
            )
        )

    def walk(
            self,
            node,
            stats,
            graph_id: str,
            is_inside_aggregate=False,
    ):

        if not node:
            return []

        # Dispatch execution to the operator responsible for the current plan node.

        op = next(iter(node))
        data = node[op]

        if op == "TableScan":
            return self.scan.execute(
                data,
                self,
                stats,
                graph_id
            )

        if op == "ExpandExec":
            return self.expand.execute(
                data,
                self,
                stats,
                graph_id
            )

        if op == "FilterExec":
            return self.filter.execute(
                data,
                self,
                stats,
                graph_id
            )

        if op == "ProjectExec":
            return self.project.execute(
                data,
                self,
                stats,
                graph_id,
                is_inside_aggregate,
            )

        if op == "SortExec":
            return self.sort.execute(
                data,
                self,
                stats,
                graph_id
            )

        if op == "LimitExec":
            return self.limit.execute(
                data,
                self,
                stats,
                graph_id
            )

        if op == "SkipExec":
            return self.skip.execute(
                data,
                self,
                stats,
                graph_id
            )

        if op == "AggregateExec":
            return self.aggregate.execute(
                data,
                self,
                stats,
                graph_id
            )

        # Continue traversing nested plan nodes when no direct handler is required.

        if "input" in data:
            return self.walk(
                data["input"],
                stats,
                graph_id,
                is_inside_aggregate,
            )

        return []
