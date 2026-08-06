import time

from layout_engine.layout_repository import (
    LayoutRepository,
)

from layout_engine.registry import (
    LAYOUT_ALGORITHMS,
)

from core.snapshot_manager import (
    SnapshotManager,
)

from logger_config import (
    get_logger,
)

from core.exceptions import (
    LayoutError,
)

logger = get_logger(__name__)


class GraphLayoutManager:

    def __init__(
            self,
            graph_service,
    ):
        self.graph = graph_service
        self.snapshots = (
            SnapshotManager()
        )

    def apply_layout(
            self,
            algorithm: str,
            params: dict | None = None,
            graph_id: str | None = None,
    ):
        gid = (
            self.graph.repository
            ._graph_id(
                graph_id
            )
        )

        try:
            params = params or {}

            logger.info(
                "Applying layout algorithm=%s graph=%s",
                algorithm,
                gid,
            )

            # Reuse cached layouts whenever possible to avoid
            # running the layout algorithm again.

            if algorithm != "natural":

                # Check whether a cached layout already exists
                # for the same graph, algorithm and parameters.

                if self.snapshots.exists(
                        gid,
                        algorithm,
                        params,
                ):

                    layout = self.snapshots._load_layout(
                        gid,
                        algorithm,
                        params,
                    )

                    if layout["layout_snapshot_id"] is None:

                        self.snapshots.delete_layout(
                            gid,
                            algorithm,
                            params,
                        )

                    else:

                        # Invalidate the cached layout if the graph has
                        # changed since the snapshot was created.

                        if self.snapshots.graph_changed(
                                gid,
                                algorithm,
                                params,
                        ):

                            logger.info(
                                "Layout cache invalidated. Recomputing %s.",
                                algorithm,
                            )

                            self.snapshots.delete_layout(
                                gid,
                                algorithm,
                                params,
                            )

                        else:

                            # Restore cached node positions instead of
                            # recalculating the layout.

                            self.snapshots.reset_to_layout_snapshot(
                                gid,
                                algorithm,
                                params,
                            )

                            snapshot = (
                                self.snapshots.get_layout_snapshot(
                                    gid,
                                    algorithm,
                                    params,
                                )
                            )

                            self.graph.layout_state.set(
                                gid,
                                algorithm,
                                params,
                            )

                            return {
                                "nodes": [
                                    {
                                        "id": node_id,
                                        "position": pos,
                                    }
                                    for node_id, pos
                                    in snapshot["positions"].items()
                                ],
                                "algorithm": algorithm,
                                "executionTimeMs": 0.0,
                            }

            # Build a lightweight repository view that exposes
            # only the data required by layout algorithms.

            repo = LayoutRepository(
                self.graph.repository,
                gid,
            )

            if algorithm not in (
                    LAYOUT_ALGORITHMS
            ):
                raise LayoutError(
                    f"Unknown layout algorithm: {algorithm}",
                    graph_id=gid,
                    details={
                        "algorithm": algorithm,
                    },
                )

            # Resolve the selected layout algorithm implementation.

            layout_fn = (
                LAYOUT_ALGORITHMS[
                    algorithm
                ]
            )

            start = time.time()

            nodes = layout_fn(
                repo,
                **params,
            )

            elapsed = (
                              time.time()
                              - start
                      ) * 1000

            response = {
                "nodes":
                    nodes,

                "algorithm":
                    algorithm,

                "executionTimeMs":
                    round(
                        elapsed,
                        2,
                    ),
            }

            # Persist the computed layout so it can be reused
            # until the graph structure changes.

            if algorithm != "natural":

                positions = {

                    n["id"]:
                        n["position"]

                    for n in nodes

                }

                self.snapshots.create_layout_snapshot(

                    graph_id=gid,

                    algorithm=algorithm,

                    params=params,

                    positions=positions,

                )

                self.graph.layout_state.set(
                    gid,
                    algorithm,
                    params,
                )

            else:

                # Natural layout reflects the current graph state,
                # so no snapshot needs to remain active.

                self.graph.layout_state.reset(
                    gid
                )

            if algorithm == "natural":
                self.graph.layout_state.reset(
                    gid
                )

            logger.info(
                "Layout %s completed in %.2f ms",
                algorithm,
                elapsed,
            )

            return response

        except Exception as e:
            logger.exception(
                "Layout algorithm failed"
            )

            raise LayoutError(
                f"Failed to execute layout '{algorithm}'.",
                graph_id=gid,
                details={
                    "algorithm": algorithm,
                    "reason": str(e),
                },
            ) from e
