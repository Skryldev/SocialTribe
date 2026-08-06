from core.graph import (
    GraphService,
)

from schemas.layout import (
    LayoutRequest,
)

from logger_config import (
    get_logger,
)

from utils.server_metrics import (
    LAYOUT_DURATION_SECONDS,
    LAYOUT_REQUESTS_TOTAL
)

logger = get_logger(__name__)


class LayoutService:

    def __init__(
            self,
            graph_service: GraphService,
    ):
        self.graph = graph_service

    def apply_layout(
            self,
            req: LayoutRequest,
    ):

        LAYOUT_REQUESTS_TOTAL.inc()

        logger.info(
            "Layout request "
            "algorithm=%s",
            req.algorithm,
        )

        with LAYOUT_DURATION_SECONDS.time():
            return (
                self.graph
                .applyLayout(
                    req.algorithm,
                    req.params,
                )
            )

    def current_layout(self):
        gid = self.graph.repository._graph_id()

        return self.graph.layout_state.get(gid)
