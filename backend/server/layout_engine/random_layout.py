from layout_engine.helpers import (
    Position,
    resolve_collisions,
    sanitize_positions,
    normalize_positions,
)

import random
import math
from typing import Optional


def random_layout(
        repo,
        seed: Optional[int] = None,
        spread_radius: float = 1600,
        min_distance: float = 200,
        **kwargs,
):
    node_ids = repo.node_ids()

    if not node_ids:
        return []

    # Use a deterministic random sequence when a seed is provided.

    if seed is not None:
        random.seed(seed)

    positions = {}

    used_positions = []

    # Search for well-separated random positions for every node.

    for node_id in node_ids:

        best_pos = None
        best_min_dist = 0

        # Sample multiple candidate positions and keep the best one found.

        for _ in range(100):

            x = (
                    random.random()
                    - 0.5
            ) * spread_radius * 2

            y = (
                    random.random()
                    - 0.5
            ) * spread_radius * 2

            min_dist_to_others = (
                float("inf")
            )

            for used in used_positions:

                dx = x - used[0]
                dy = y - used[1]

                dist = math.sqrt(
                    dx * dx
                    + dy * dy
                )

                min_dist_to_others = min(
                    min_dist_to_others,
                    dist,
                )

            if (
                    min_dist_to_others
                    > best_min_dist
            ):
                best_min_dist = (
                    min_dist_to_others
                )

                best_pos = (
                    x,
                    y,
                )

            if (
                    min_dist_to_others
                    > min_distance * 1.5
            ):
                break

        if best_pos:

            x, y = best_pos

        else:

            x = (
                    random.random()
                    - 0.5
            ) * spread_radius

            y = (
                    random.random()
                    - 0.5
            ) * spread_radius

        used_positions.append(
            (x, y)
        )

        positions[node_id] = Position(
            x,
            y,
        )

    # Resolve any remaining node overlaps before returning the layout.

    resolve_collisions(
        positions,
        min_distance,
        20,
    )

    positions = sanitize_positions(
        node_ids,
        positions,
    )

    return normalize_positions(
        positions,
    )