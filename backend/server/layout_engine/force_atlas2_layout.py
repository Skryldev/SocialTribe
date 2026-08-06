from typing import Dict

from layout_engine.helpers import (
    Position,
    initialize_spread_positions,
    safe_divide,
    sanitize_positions,
    resolve_collisions,
    normalize_positions
)

import math


def force_atlas2_layout(
        repo,
        gravity: float = 0.5,
        scaling: float = 12,
        lin_log: bool = False,
        iterations: int = 300,
        min_distance: float = 200,
        **kwargs,
):
    """
    ForceAtlas2 layout algorithm.
    """

    node_ids = repo.node_ids()

    if not node_ids:
        return []

    if len(node_ids) == 1:
        return [
            {
                "id": node_ids[0],
                "position": {
                    "x": 0,
                    "y": 0,
                }
            }
        ]

    positions: Dict[str, Position] = {}

    # Initialize node positions with a well-separated starting layout.

    initialize_spread_positions(
        node_ids,
        positions,
        2000,
        min_distance,
    )

    degrees = repo.degree_batch(
        node_ids
    )

    # Cache graph connectivity for repeated force calculations.

    adjacency = repo.neighbors_batch(
        node_ids
    )

    avg_degree = (
        sum(
            degrees.values()
        ) / len(node_ids)
        if node_ids
        else 1
    )

    if avg_degree <= 0:
        avg_degree = 1

    # Iteratively balance repulsive and attractive forces.

    for iteration in range(iterations):

        forces: Dict[str, Position] = {
            node_id: Position(
                0,
                0,
            )
            for node_id
            in node_ids
        }

        entries = list(
            positions.items()
        )

        # -------------------------
        # Repulsive forces
        # -------------------------

        for i in range(len(entries)):

            id_a, pos_a = entries[i]

            for j in range(
                    i + 1,
                    len(entries),
            ):
                id_b, pos_b = entries[j]

                dx = (
                        pos_a.x
                        - pos_b.x
                )

                dy = (
                        pos_a.y
                        - pos_b.y
                )

                dist = (
                        math.sqrt(
                            dx * dx
                            + dy * dy
                        )
                        or 1.0
                )

                if not math.isfinite(
                        dist
                ):
                    continue

                rf = (
                             scaling
                             * scaling
                     ) / (
                             dist
                             * dist
                     )

                if not math.isfinite(
                        rf
                ):
                    continue

                nx = safe_divide(
                    dx,
                    dist,
                )

                ny = safe_divide(
                    dy,
                    dist,
                )

                forces[id_a].x += (
                        nx
                        * rf
                        * 2
                )

                forces[id_a].y += (
                        ny
                        * rf
                        * 2
                )

                forces[id_b].x -= (
                        nx
                        * rf
                        * 2
                )

                forces[id_b].y -= (
                        ny
                        * rf
                        * 2
                )

        # -------------------------
        # Attractive forces
        # -------------------------

        for source, neighbors in (
                adjacency.items()
        ):

            src = positions.get(
                source
            )

            if src is None:
                continue

            for target in neighbors:

                # هر یال فقط یک بار
                if source > target:
                    continue

                tgt = positions.get(
                    target
                )

                if tgt is None:
                    continue

                dx = (
                        tgt.x
                        - src.x
                )

                dy = (
                        tgt.y
                        - src.y
                )

                dist = (
                        math.sqrt(
                            dx * dx
                            + dy * dy
                        )
                        or 1.0
                )

                if not math.isfinite(
                        dist
                ):
                    continue

                effective_dist = dist

                if lin_log:
                    effective_dist = (
                        math.log(
                            1 + dist
                        )
                    )

                if (
                        effective_dist
                        < min_distance
                ):
                    continue

                force = (
                        effective_dist
                        / avg_degree
                        * 0.3
                )

                if not math.isfinite(
                        force
                ):
                    continue

                nx = safe_divide(
                    dx,
                    dist,
                )

                ny = safe_divide(
                    dy,
                    dist,
                )

                forces[source].x += (
                        nx
                        * force
                )

                forces[source].y += (
                        ny
                        * force
                )

                forces[target].x -= (
                        nx
                        * force
                )

                forces[target].y -= (
                        ny
                        * force
                )

        # -------------------------
        # Apply forces
        # -------------------------

        # Update node positions using the accumulated forces.

        for node_id, force in (
                forces.items()
        ):
            pos = positions.get(
                node_id
            )

            if pos is None:
                continue

            deg = degrees.get(
                node_id,
                1,
            )

            gf = (
                    gravity
                    * (1 + deg)
                    / avg_degree
            )

            force.x -= (
                    pos.x
                    * gf
            )

            force.y -= (
                    pos.y
                    * gf
            )

            swing = (
                    math.sqrt(
                        force.x
                        * force.x
                        + force.y
                        * force.y
                    )
                    or 1.0
            )

            speed = (
                    min(
                        swing,
                        10,
                    )
                    / swing
            )

            pos.x += (
                    force.x
                    * speed
                    * 0.03
            )

            pos.y += (
                    force.y
                    * speed
                    * 0.03
            )

        if iteration % 5 == 0:
            resolve_collisions(
                positions,
                min_distance,
                3,
            )

    # Perform a final collision pass before returning the layout.

    resolve_collisions(
        positions,
        min_distance,
        25,
    )

    positions = sanitize_positions(
        node_ids,
        positions,
    )

    return normalize_positions(
        positions,
    )
