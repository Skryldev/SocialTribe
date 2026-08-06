from layout_engine.helpers import (
    Position,
    resolve_collisions,
    sanitize_positions,
    normalize_positions
)

import math
from collections import defaultdict, deque
from typing import Optional


def radial_layout(
        repo,
        center_node_id: Optional[str] = None,
        ring_distance: float = 350,
        max_rings: int = 5,
        auto_select_center: bool = True,
        min_distance: float = 200,
        **kwargs,
):
    """
    Concentric rings around a center node.
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

    center = center_node_id

    # --------------------------------------------------
    # Auto select center
    # --------------------------------------------------

    # Select a central node automatically when none is provided.

    if auto_select_center and not center:

        degrees = repo.degree_batch(
            node_ids
        )

        if node_ids:
            center = max(
                node_ids,
                key=lambda n:
                degrees.get(
                    n,
                    0,
                )
            )

    # --------------------------------------------------
    # Adjacency
    # --------------------------------------------------

    # Build graph connectivity for ring assignment.

    adj = repo.neighbors_batch(
        node_ids
    )

    rings = {}

    visited = set()

    queue = deque()

    if center:
        rings[center] = 0
        visited.add(center)
        queue.append(center)

    # --------------------------------------------------
    # BFS
    # --------------------------------------------------

    # Traverse the graph breadth-first to assign ring levels.

    while queue:

        cur = queue.popleft()

        r = rings[cur] + 1

        if r > max_rings:
            continue

        for nb in adj.get(
                cur,
                []
        ):
            if nb in visited:
                continue

            visited.add(nb)

            rings[nb] = r

            queue.append(nb)

    # --------------------------------------------------
    # Unvisited / Isolated nodes
    # --------------------------------------------------

    max_assigned_ring = max_rings

    for node_id in node_ids:

        if node_id not in rings:
            max_assigned_ring = max(
                max_assigned_ring,
                max_rings + 1,
            )

            rings[node_id] = (
                max_assigned_ring
            )

    # --------------------------------------------------
    # Groups
    # --------------------------------------------------

    groups = defaultdict(list)

    for node_id, r in rings.items():
        groups[r].append(
            node_id
        )

    # --------------------------------------------------
    # Positions
    # --------------------------------------------------

    positions = {}

    # Position nodes according to their assigned radial ring.

    for node_id in node_ids:

        r = rings.get(
            node_id,
            0,
        )

        if r == 0:
            positions[node_id] = Position(
                0,
                0,
            )

            continue

        group = groups.get(
            r,
            [node_id],
        )

        idx = (
            group.index(node_id)
            if node_id in group
            else 0
        )

        angle = (
                2
                * math.pi
                * idx
                / max(
            len(group),
            1,
        )
        )

        dist = (
                r
                * ring_distance
        )

        positions[node_id] = Position(
            math.cos(angle)
            * dist,

            math.sin(angle)
            * dist,
        )

    # Resolve any remaining node overlaps before returning the layout.

    resolve_collisions(
        positions,
        min_distance,
        10,
    )

    positions = sanitize_positions(
        node_ids,
        positions,
    )

    return normalize_positions(
        positions,
    )
