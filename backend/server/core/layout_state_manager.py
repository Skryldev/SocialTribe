from threading import RLock
from logger_config import (
    get_logger,
)

logger = get_logger(__name__)

class LayoutStateManager:

    def __init__(self):
        self.mu = RLock()

        # Store the active layout configuration for each graph.

        self.states: dict[
            str,
            dict,
        ] = {}

    def get(
            self,
            graph_id: str,
    ) -> dict:

        with self.mu:

            # Return the default natural layout when no state
            # has been recorded for the graph.

            return self.states.get(
                graph_id,
                {
                    "algorithm": "natural",
                    "mode": "preset",
                    "params": {},
                },
            )

    def set(
            self,
            graph_id: str,
            algorithm: str,
            params: dict | None = None,
    ):

        params = params or {}

        logger.info(
            "Layout state updated.",
            extra={
                "extra_data": {
                    "graph_id": graph_id,
                    "algorithm": algorithm,
                    "mode": (
                        "preset"
                        if not params
                        else "custom"
                    ),
                }
            },
        )

        with self.mu:

            # Persist the active layout configuration.

            self.states[
                graph_id
            ] = {

                "algorithm":
                    algorithm,

                "mode":
                    (
                        "preset"
                        if not params
                        else "custom"
                    ),

                "params":
                    params,
            }

    def reset(
            self,
            graph_id: str,
    ):

        logger.info(
            "Layout state reset.",
            extra={
                "extra_data": {
                    "graph_id": graph_id,
                }
            },
        )

        with self.mu:

            # Restore the default layout state.

            self.states[
                graph_id
            ] = {

                "algorithm":
                    "natural",

                "mode":
                    "preset",

                "params":
                    {},
            }

    def current_algorithm(
            self,
            graph_id: str,
    ) -> str:

        return self.get(
            graph_id
        )[
            "algorithm"
        ]

    def current_params(
            self,
            graph_id: str,
    ) -> dict:

        return self.get(
            graph_id
        )[
            "params"
        ]

    def is_natural(
            self,
            graph_id: str,
    ) -> bool:

        return (
            self.current_algorithm(
                graph_id
            )
            ==
            "natural"
        )

    def is_custom(
            self,
            graph_id: str,
    ) -> bool:

        return (
            self.get(
                graph_id
            )[
                "mode"
            ]
            ==
            "custom"
        )