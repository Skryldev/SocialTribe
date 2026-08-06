from query_engine.executor import GraphExecutor
from query_engine.query_repository import QueryRepository
from schemas.query import (
    QueryResponse,
)

class GraphQueryManager:

    def __init__(
            self,
            graph,
    ):

        self.graph = graph

        # Create the repository used to resolve query operations.

        self.query_repository = QueryRepository(
            graph.repository
        )

        # Create the execution engine for physical query plans.

        self.executor = GraphExecutor(
            self.query_repository
        )

    # =====================================================
    # Physical Plan
    # =====================================================

    def execute_plan(
            self,
            plan: dict,
            graph_id: str | None = None,
    )->QueryResponse:

        gid = self.graph.repository._graph_id(
            graph_id
        )

        return self.executor.execute(
            plan=plan,
            graph_id=gid,
        )