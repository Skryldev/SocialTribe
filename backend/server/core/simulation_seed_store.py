from threading import RLock
from logger_config import (
    get_logger,
)

logger = get_logger(__name__)

class SimulationSeedStore:

    def __init__(self):
        self._lock = RLock()

        # Store the current simulation seed nodes for each graph.

        self._seeds = {}

    def set_seeds(
            self,
            graph_id: str,
            seeds: list[str],
    ):
        with self._lock:

            # Store a copy to prevent external modifications.

            self._seeds[graph_id] = list(seeds)

        logger.debug(
            "Stored %d simulation seeds "
            "for graph %s",
            len(seeds),
            graph_id,
        )

    def get_seeds(
            self,
            graph_id: str,
    ) -> list[str]:
        with self._lock:
            seeds = list(
                self._seeds.get(
                    graph_id,
                    [],
                )
            )

        logger.debug(
            "Retrieved %d simulation seeds "
            "for graph %s",
            len(seeds),
            graph_id,
        )

        return seeds

    def clear(
            self,
            graph_id: str,
    ):
        with self._lock:
            removed = (
                    graph_id in self._seeds
            )

            self._seeds.pop(
                graph_id,
                None,
            )

        if removed:
            logger.debug(
                "Cleared simulation seeds "
                "for graph %s",
                graph_id,
            )


simulation_seed_store = (
    SimulationSeedStore()
)