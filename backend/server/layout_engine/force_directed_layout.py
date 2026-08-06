from layout_engine.helpers import (
    Position,
    initialize_spread_positions,
    safe_divide,
    resolve_collisions,
    sanitize_positions,
    normalize_positions,
    clamp,
)

import math


def force_directed_layout(
        repo,
        repulsion_force: float = 800,
        attraction_force: float = 0.5,
        iterations: int = 400,
        temperature: float = 200,
        damping: float = 0.94,
        area: float = 300000,
        gravity: float = 0.01,
        min_distance: float = 200,
        **kwargs,
):
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

    positions = {}
    velocities = {}

    # Initialize node positions with a well-separated starting layout.

    initialize_spread_positions(
        node_ids,
        positions,
        math.sqrt(area) * 1.2,
        min_distance,
    )

    for node_id in node_ids:
        velocities[node_id] = Position(
            0,
            0,
        )

    # Cache graph connectivity for repeated force calculations.

    adj = repo.neighbors_batch(
        node_ids
    )

    area_size = math.sqrt(area)

    # Simulate forces until the layout converges.

    for iteration in range(iterations):

        temp = (
                temperature
                * math.pow(
            1 - iteration / iterations,
            damping,
        )
        )

        entries = list(
            positions.items()
        )

        for i in range(len(entries)):

            id_a, pos_a = entries[i]

            fx = 0.0
            fy = 0.0

            # Repulsion
            for j in range(len(entries)):

                if i == j:
                    continue

                _, pos_b = entries[j]

                dx = pos_a.x - pos_b.x
                dy = pos_a.y - pos_b.y

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

                effective_dist = max(
                    dist,
                    1.0,
                )

                force = (
                                repulsion_force
                                * repulsion_force
                        ) / (
                                effective_dist
                                * effective_dist
                        )

                fx += (
                        safe_divide(
                            dx,
                            dist,
                        )
                        * force
                        * 2
                )

                fy += (
                        safe_divide(
                            dy,
                            dist,
                        )
                        * force
                        * 2
                )

            # Attraction
            neighbors = adj.get(
                id_a,
                [],
            )

            for nb in neighbors:

                pos_b = positions.get(
                    nb
                )

                if not pos_b:
                    continue

                dx = (
                        pos_b.x
                        - pos_a.x
                )

                dy = (
                        pos_b.y
                        - pos_a.y
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

                if (
                        dist
                        > min_distance * 2
                ):
                    force = (
                                    dist
                                    * dist
                            ) / attraction_force

                    fx += (
                            safe_divide(
                                dx,
                                dist,
                            )
                            * force
                            * 0.3
                    )

                    fy += (
                            safe_divide(
                                dy,
                                dist,
                            )
                            * force
                            * 0.3
                    )

            fx -= (
                    pos_a.x
                    * gravity
            )

            fy -= (
                    pos_a.y
                    * gravity
            )

            vel = velocities[id_a]

            vel.x = (
                            vel.x
                            + fx * 0.003
                    ) * damping

            vel.y = (
                            vel.y
                            + fy * 0.003
                    ) * damping

            speed = (
                    math.sqrt(
                        vel.x * vel.x
                        + vel.y * vel.y
                    )
                    or 1.0
            )

            if speed > temp:
                vel.x = (
                                vel.x
                                / speed
                        ) * temp

                vel.y = (
                                vel.y
                                / speed
                        ) * temp

        # Apply the updated velocities while keeping nodes inside the layout bounds.

        for node_id, pos in positions.items():
            vel = velocities[node_id]

            pos.x = clamp(
                pos.x + vel.x,
                -area_size / 2,
                area_size / 2,
            )

            pos.y = clamp(
                pos.y + vel.y,
                -area_size / 2,
                area_size / 2,
            )

        if iteration % 5 == 0:
            resolve_collisions(
                positions,
                min_distance,
                5,
            )

    # Resolve any remaining node overlaps before returning the layout.

    resolve_collisions(
        positions,
        min_distance,
        30,
    )

    positions = sanitize_positions(
        node_ids,
        positions,
    )

    return normalize_positions(
        positions,
    )
