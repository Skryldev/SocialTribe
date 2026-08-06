from layout_engine.helpers import (
    Position,
    resolve_collisions,
    sanitize_positions,
    normalize_positions
)

import math
import random


def spectral_layout(
        repo,
        dimensions: int = 2,
        scaling: float = 600,
        min_distance: float = 200,
        **kwargs,
):
    """
    Eigenvector-based positioning.
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

    n = len(node_ids)

    idx_map = {
        node_id: i
        for i, node_id
        in enumerate(node_ids)
    }

    degrees = [0] * n
    pairs = []

    # Build the graph connectivity used to construct the Laplacian.

    adjacency = (
        repo.neighbors_batch(
            node_ids
        )
    )

    for source, neighbors in (
            adjacency.items()
    ):
        i = idx_map.get(source)

        if i is None:
            continue

        for target in neighbors:

            j = idx_map.get(target)

            if (
                    j is None
                    or
                    i >= j
            ):
                continue

            degrees[i] += 1
            degrees[j] += 1

            pairs.append(
                (i, j)
            )

    vectors = []

    # Estimate the leading eigenvectors used for spectral embedding.

    for _ in range(
            min(
                dimensions + 1,
                n,
            )
    ):

        v = [
            random.random() * 2 - 1
            for _ in range(n)
        ]

        for _ in range(50):

            nv = [0.0] * n

            for i in range(n):
                nv[i] = (
                        degrees[i]
                        * v[i]
                )

            for i, j in pairs:
                nv[i] -= v[j]
                nv[j] -= v[i]

            for p in vectors:

                dot = sum(
                    nv[i] * p[i]
                    for i in range(n)
                )

                for i in range(n):
                    nv[i] -= (
                            dot
                            * p[i]
                    )

            norm = math.sqrt(
                sum(
                    nv[i] * nv[i]
                    for i in range(n)
                )
            )

            if norm < 1e-10:
                break

            for i in range(n):
                v[i] = nv[i] / norm

        vectors.append(v)

    positions = {}

    # Map the selected eigenvectors into two-dimensional coordinates.

    for i, node_id in enumerate(
            node_ids
    ):
        x = (
            vectors[1][i]
            if len(vectors) > 1
            else 0.0
        )

        y = (
            vectors[2][i]
            if len(vectors) > 2
            else 0.0
        )

        positions[node_id] = Position(
            x=x * scaling,
            y=y * scaling,
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
