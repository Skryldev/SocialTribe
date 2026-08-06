import math
from layout_engine.helpers import normalize_positions


def circular_layout(
        repo,
        radius: float = 650,
        start_angle: float = -math.pi / 2,
        node_ordering: str = "degree",
        direction: str = "clockwise",
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

    # Expand the circle when necessary to preserve the minimum node spacing.

    circumference = (
            len(node_ids)
            * min_distance
    )

    min_radius = (
            circumference
            / (2 * math.pi)
    )

    effective_radius = max(
        radius,
        min_radius,
    )

    ordered = list(node_ids)

    # Order nodes before placement to improve visual readability.

    if node_ordering == "degree":

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

    elif node_ordering == "id":
        ordered.sort()

    step = (
            2
            * math.pi
            / len(ordered)
    )

    direction_mult = (
        -1
        if direction
           == "counterclockwise"
        else 1
    )

    # Distribute nodes evenly around the circle.

    positions = [
        {
            "id": node_id,
            "position": {
                "x":
                    math.cos(
                        start_angle
                        + direction_mult
                        * i
                        * step
                    )
                    * effective_radius,

                "y":
                    math.sin(
                        start_angle
                        + direction_mult
                        * i
                        * step
                    )
                    * effective_radius,
            }
        }
        for i, node_id
        in enumerate(ordered)
    ]

    return normalize_positions(
        positions
    )