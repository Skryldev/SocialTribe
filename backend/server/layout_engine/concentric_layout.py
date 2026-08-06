from collections import defaultdict
from layout_engine.helpers import (
    Position,
    resolve_collisions,
    sanitize_positions,
    normalize_positions
)
import math


def concentric_layout(
        repo,
        ring_count: int = 4,
        metric: str = "degree",
        ring_spacing: float = 400,
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

    scores = {
        node_id: 0
        for node_id
        in node_ids
    }

    # Score nodes using the selected ranking metric.

    if metric == "degree":
        scores = repo.degree_batch(
            node_ids
        )

    max_score = (
        max(scores.values())
        if scores
        else 1
    )

    rings = {}

    # Assign every node to a concentric ring.

    for node_id in node_ids:

        s = scores.get(
            node_id,
            0,
        )

        if max_score > 0:

            ring = min(
                ring_count - 1,
                int(
                    (
                            1
                            - s
                            / max_score
                    )
                    * ring_count
                ),
            )

        else:
            ring = 0

        rings[node_id] = ring

    groups = defaultdict(list)

    for r in range(ring_count):
        groups[r] = []

    for node_id, r in rings.items():
        groups[r].append(
            node_id
        )

    # Order nodes within each ring before placement.

    for group in groups.values():
        group.sort(
            key=lambda n: scores.get(
                n,
                0,
            ),
            reverse=True,
        )

    positions = {}

    # Position each node on its assigned ring.

    for node_id in node_ids:
        r = rings.get(
            node_id,
            0,
        )

        group = groups.get(
            r,
            [node_id],
        )

        idx = (
            group.index(node_id)
            if node_id in group
            else 0
        )

        total = max(
            len(group),
            1,
        )

        angle = (
                2
                * math.pi
                * idx
                / total
        )

        dist = (
                       r + 1
               ) * ring_spacing

        positions[node_id] = Position(
            math.cos(angle)
            * dist,

            math.sin(angle)
            * dist,
        )

    resolve_collisions(
        positions,
        min_distance,
        15,
    )

    positions = sanitize_positions(
        node_ids,
        positions,
    )

    return normalize_positions(
        positions,
    )
