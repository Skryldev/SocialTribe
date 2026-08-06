from datetime import datetime

from schemas.analysis_state import (
    GraphAnalysisState,
)
from logger_config import (
    get_logger
)

from core.exceptions import (
    AnalysisStateError,
)

logger = get_logger(__name__)


class GraphAnalysisManager:

    def __init__(
            self,
            graph_service,
    ):
        self.graph = graph_service

        self._analysis_state = {}

        logger.info(
            "GraphAnalysisManager initialized"
        )

    # =====================================================
    # Analysis State
    # =====================================================

    def _get_analysis_state(
            self,
            graph_id: str,
    ):
        if not graph_id:
            raise AnalysisStateError(
                "Graph id is required."
            )

        if graph_id not in self._analysis_state:
            logger.debug(
                "Creating analysis state for graph %s",
                graph_id,
            )

            self._analysis_state[
                graph_id
            ] = GraphAnalysisState()

        return self._analysis_state[
            graph_id
        ]

    # =====================================================
    # Viewport
    # =====================================================

    def _set_viewport_nodes(
            self,
            graph_id: str,
            node_ids: list[str],
    ):

        logger.debug(
            "Viewport updated for graph %s (%d nodes)",
            graph_id,
            len(node_ids),
        )

        state = self._get_analysis_state(
            graph_id
        )

        state.viewport_nodes = set(
            node_ids
        )

        state.viewport_generation += 1
        state.last_viewport_update = (
            datetime.now()
        )
