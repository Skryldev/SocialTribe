from core.graph_instance import (
    graph_service,
)
from schemas.query import QueryRequest
from schemas.query import (
    QueryResponse,
)

from utils.server_metrics import (
    QUERY_REQUESTS_TOTAL,
    QUERY_DURATION_SECONDS
)


class QueryService:

    def __init__(self):
        self.graph = graph_service

    # =====================================================

    def execute_plan(
            self,
            request: QueryRequest,
            graph_id: str | None = None,
    ) -> QueryResponse:

        QUERY_REQUESTS_TOTAL.inc()

        with QUERY_DURATION_SECONDS.time():
            return self.graph.query.execute_plan(
                request.plan,
                graph_id,
            )
