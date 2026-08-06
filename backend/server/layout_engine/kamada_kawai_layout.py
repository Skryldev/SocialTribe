from layout_engine.helpers import (
    initialize_spread_positions,
    Position,
    sanitize_positions,
    safe_divide,
    resolve_collisions,
    normalize_positions
)

import math


def kamada_kawai_layout(
        repo,
        tolerance: float = 0.0001,
        max_iterations: int = 500,
        damping_factor: float = 0.9,
        ideal_edge_length: float = 350,
        min_distance: float = 200,
        **kwargs,
):
    """
    Kamada-Kawai energy minimization layout.
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

    effective_ideal_length = max(
        ideal_edge_length,
        min_distance,
    )

    n = len(node_ids)

    positions = {}

    # Initialize node positions before the optimization process.

    initialize_spread_positions(
        node_ids,
        positions,
        effective_ideal_length
        * math.sqrt(n)
        * 0.8,
        min_distance,
    )

    node_array = [
        {
            "id": node_id,
            "position": positions.get(
                node_id,
                Position(
                    0,
                    0,
                ),
            ),
        }
        for node_id in node_ids
    ]

    # --------------------------------------------------
    # Distance Matrix
    # --------------------------------------------------

    dist_matrix = [
        [float("inf")] * n
        for _ in range(n)
    ]

    idx_map = {
        node_id: i
        for i, node_id
        in enumerate(node_ids)
    }

    for i in range(n):
        dist_matrix[i][i] = 0

    # Build the graph connectivity used to compute shortest-path distances.

    adjacency = repo.neighbors_batch(
        node_ids
    )

    for source, neighbors in (
            adjacency.items()
    ):
        i = idx_map.get(source)

        if i is None:
            continue

        for target in neighbors:

            j = idx_map.get(target)

            if j is None:
                continue

            dist_matrix[i][j] = 1
            dist_matrix[j][i] = 1

    # --------------------------------------------------
    # Floyd-Warshall
    # --------------------------------------------------

    # Compute all-pairs shortest-path distances with Floyd-Warshall.

    for k in range(n):
        for i in range(n):

            dik = dist_matrix[i][k]

            if not math.isfinite(
                    dik
            ):
                continue

            for j in range(n):

                alt = (
                        dik
                        + dist_matrix[k][j]
                )

                if (
                        alt
                        < dist_matrix[i][j]
                ):
                    dist_matrix[i][j] = alt

    finite_distances = [
        d
        for row in dist_matrix
        for d in row
        if math.isfinite(d)
    ]

    max_dist = max(
        finite_distances,
        default=1,
    )

    # --------------------------------------------------
    # L matrix
    # --------------------------------------------------

    L = [
        [
            (
                    d
                    * effective_ideal_length
            )
            if math.isfinite(d)
            else (
                    max_dist
                    * 2
                    * effective_ideal_length
            )
            for d in row
        ]
        for row
        in dist_matrix
    ]

    # --------------------------------------------------
    # K matrix
    # --------------------------------------------------

    K = [
        [
            0
            if d == 0
            else (
                    1
                    / max(
                d * d,
                0.001,
            )
            )
            for d in row
        ]
        for row
        in dist_matrix
    ]

    # --------------------------------------------------
    # Energy Minimization
    # --------------------------------------------------

    # Iteratively minimize the graph layout energy.

    for iteration in range(
            min(
                max_iterations,
                n * 15,
            )
    ):

        max_grad = -1
        max_node = 0

        for i in range(n):

            gx = 0.0
            gy = 0.0

            for j in range(n):

                if i == j:
                    continue

                dx = (
                        node_array[i]
                        ["position"]
                        .x
                        -
                        node_array[j]
                        ["position"]
                        .x
                )

                dy = (
                        node_array[i]
                        ["position"]
                        .y
                        -
                        node_array[j]
                        ["position"]
                        .y
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

                delta = (
                        dist
                        - L[i][j]
                )

                gx += (
                        K[i][j]
                        * delta
                        * safe_divide(
                    dx,
                    dist,
                )
                )

                gy += (
                        K[i][j]
                        * delta
                        * safe_divide(
                    dy,
                    dist,
                )
                )

            grad = math.sqrt(
                gx * gx
                + gy * gy
            )

            if (
                    grad > max_grad
                    and
                    math.isfinite(
                        grad
                    )
            ):
                max_grad = grad
                max_node = i

        if max_grad < tolerance:
            break

        node = node_array[
            max_node
        ]

        for j in range(n):

            if max_node == j:
                continue

            dx = (
                    node["position"].x
                    -
                    node_array[j]
                    ["position"].x
            )

            dy = (
                    node["position"].y
                    -
                    node_array[j]
                    ["position"].y
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

            delta = (
                    dist
                    - L[max_node][j]
            )

            force = (
                    delta
                    * K[max_node][j]
                    * damping_factor
                    / dist
            )

            if math.isfinite(
                    force
            ):
                node["position"].x -= (
                        force
                        * dx
                )

                node["position"].y -= (
                        force
                        * dy
                )

    pos_map = {
        n["id"]:
            n["position"]
        for n in node_array
    }

    # Resolve any remaining node overlaps before returning the layout.

    resolve_collisions(
        pos_map,
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
