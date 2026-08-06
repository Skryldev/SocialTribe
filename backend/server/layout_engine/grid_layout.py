import math
from layout_engine.helpers import (
    normalize_positions,
    sanitize_positions
)


def grid_layout(
        repo,
        columns=None,
        spacing: float = 320,
        ordering: str = "degree",
        min_distance: float = 200,
        **kwargs,
):
    node_ids = repo.node_ids()

    if not node_ids:
        return []

    # Ensure adjacent grid cells respect the minimum node spacing.

    effective_spacing = max(
        spacing,
        min_distance,
    )

    cols = (
            columns
            or math.ceil(
        math.sqrt(
            len(node_ids)
        )
    )
    )

    ordered = list(node_ids)

    # Order nodes before assigning grid positions.

    if ordering == "degree":

        degrees = repo.degree_batch(
            node_ids
        )

        ordered.sort(
            key=lambda n: degrees.get(
                n,
                0,
            ),
            reverse=True,
        )

    elif ordering == "id":
        ordered.sort()

    rows = math.ceil(
        len(ordered) / cols
    )

    start_x = (
            -(cols - 1)
            * effective_spacing
            / 2
    )

    start_y = (
            -(rows - 1)
            * effective_spacing
            / 2
    )

    # Place nodes row by row across the grid.

    positions = [
        {
            "id": node_id,
            "position": {
                "x":
                    start_x
                    + (i % cols)
                    * effective_spacing,

                "y":
                    start_y
                    + (i // cols)
                    * effective_spacing,
            }
        }
        for i, node_id
        in enumerate(ordered)
    ]

    return normalize_positions(
        positions
    )
