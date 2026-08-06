from typing import Dict

from core.graph import GraphService
from algorithms.rumor_simulation import (
    RumorSimulationEngine,
)

from logger_config import (
    get_logger,
)

from core.exceptions import (
    SimulationNotInitializedError,
)

from core.simulation_seed_store import (
    simulation_seed_store,
)

from utils.server_metrics import (
    SIMULATION_RUNS_TOTAL,
    SIMULATION_DURATION_SECONDS,
    INFLUENCE_MAXIMIZATION_DURATION_SECONDS,
    INFLUENCE_MAXIMIZATION_REQUESTS_TOTAL
)

logger = get_logger(__name__)


class SimulationService:

    def __init__(
            self,
            graph_service: GraphService,
    ):
        self.graph_service = graph_service

        self.simulations: Dict[
            str,
            RumorSimulationEngine,
        ] = {}

    # =====================================================
    # Helpers
    # =====================================================

    @staticmethod
    def _state_dict(
            state,
    ):
        return {
            "days": [
                {
                    "day": day.day,
                    "nodeUpdates": day.node_updates,
                    "stats": day.stats,
                }
                for day in state.timeline
            ],
            "totalDays": len(
                state.timeline
            ),
            "totalTicks": state.current_day,
            "finalCoverage": state.coverage,
        }

    def run_once(
            self,
            model: str = "wave",
            probability: float = 0.3,
            threshold: int = 2,
            max_ticks: int = 100,
    ):

        SIMULATION_RUNS_TOTAL.inc()

        logger.info(
            "Running one-shot simulation "
            "model=%s",
            model,
        )

        graph_id = (
            self.graph_service
            .repository
            ._graph_id()
        )

        seed_ids = (
            simulation_seed_store
            .get_seeds(
                graph_id
            )
        )

        if not seed_ids:
            raise SimulationNotInitializedError(
                "No influence seeds available."
            )

        engine = (
            self.graph_service
            .create_simulation_engine(graph_id)
        )

        engine.initialize(
            seed_ids=seed_ids,
            model=model,
            probability=probability,
            threshold=threshold,
        )

        state = (
            engine.run_until_complete(
                model=model,
                probability=probability,
                threshold=threshold,
                max_ticks=max_ticks,
            )
        )

        with SIMULATION_DURATION_SECONDS.time():
            return self._state_dict(
                state
            )

    def influence_maximization(
            self,
            k: int,
            method: str = "optimal",
    ):

        INFLUENCE_MAXIMIZATION_REQUESTS_TOTAL.inc()

        graph_id = (
            self.graph_service.repository
            ._graph_id()
        )

        algo = (
            self.graph_service
            .createInfluenceMaximizer(
                graph_id
            )
        )

        with INFLUENCE_MAXIMIZATION_DURATION_SECONDS.time():
            return algo.run(
                k,
                method,
            )
