from dataclasses import dataclass
from typing import Dict, List, Optional, Set
import math
import random

# ==========================================================
# Layout Metrics (Frontend Constraints)
# ==========================================================

NODE_WIDTH = 217.0
NODE_HEIGHT = 70.0

MIN_NODE_DISTANCE = NODE_WIDTH

VIEWPORT_WIDTH = 2330.0
VIEWPORT_HEIGHT = 1195.0

VIEWPORT_PADDING = 80.0


# -------------------------------------------------
# Frontend Density Metrics
# -------------------------------------------------

TARGET_MIN_VISIBLE_NODES = 8
TARGET_MAX_VISIBLE_NODES = 50

MAX_DOWNSCALE = 0.85
MAX_UPSCALE = 2.0


@dataclass
class Position:
    x: float
    y: float


def clamp(
        val: float,
        min_val: float,
        max_val: float,
):
    return max(
        min_val,
        min(max_val, val)
    )


def safe_divide(
        a: float,
        b: float,
        fallback: float = 1.0,
):
    # Prevent invalid arithmetic from propagating through layout calculations.

    if b == 0 or not math.isfinite(b):
        return fallback

    result = a / b

    return (
        result
        if math.isfinite(result)
        else fallback
    )


def sanitize_positions(
        node_ids,
        positions,
):

    # Convert internal position objects into the layout response format.

    return [
        {
            "id": node_id,
            "position": {
                "x":
                    positions[node_id].x,
                "y":
                    positions[node_id].y,
            },
        }
        for node_id
        in node_ids
    ]


def ensure_position(pos: Optional[Dict], fallback: Position = Position(0, 0)) -> Position:
    if not pos:
        return fallback
    return Position(
        x=pos.get('x', fallback.x) if isinstance(pos, dict) else fallback.x,
        y=pos.get('y', fallback.y) if isinstance(pos, dict) else fallback.y
    )


def resolve_collisions(
        positions: Dict[str, Position],
        min_distance: float = 200,
        max_iterations: int = 15,
):
    entries = list(positions.items())

    if len(entries) < 2:
        return

    for _ in range(max_iterations):

        has_collision = False

        for i in range(len(entries)):
            _, pos_a = entries[i]

            for j in range(i + 1, len(entries)):
                _, pos_b = entries[j]

                dx = pos_b.x - pos_a.x
                dy = pos_b.y - pos_a.y

                # Special case: identical positions
                if abs(dx) < 0.001 and abs(dy) < 0.001:
                    angle = random.random() * 2 * math.pi
                    spread = NODE_WIDTH

                    pos_a.x += math.cos(angle) * spread
                    pos_a.y += math.sin(angle) * spread
                    pos_b.x -= math.cos(angle) * spread
                    pos_b.y -= math.sin(angle) * spread

                    has_collision = True
                    continue

                overlap_x = NODE_WIDTH - abs(dx)
                overlap_y = NODE_HEIGHT - abs(dy)

                if overlap_x <= 0 or overlap_y <= 0:
                    continue

                has_collision = True

                # Resolve along the axis with the smaller overlap
                if overlap_x < overlap_y:

                    shift = overlap_x / 2 + 5

                    if dx > 0:
                        pos_a.x -= shift
                        pos_b.x += shift
                    else:
                        pos_a.x += shift
                        pos_b.x -= shift

                else:

                    shift = overlap_y / 2 + 5

                    if dy > 0:
                        pos_a.y -= shift
                        pos_b.y += shift
                    else:
                        pos_a.y += shift
                        pos_b.y -= shift

        if not has_collision:
            break

def initialize_spread_positions(
        node_ids: list[str],
        positions: Dict[str, Position],
        spread_range: float,
        min_distance: float = 200,
):
    used_positions: list[Position] = []

    # ---------------------------------------------------------
    # Density-aware initial spread
    # ---------------------------------------------------------

    TARGET_VISIBLE_NODES = 40

    if len(node_ids) > TARGET_VISIBLE_NODES:
        density_scale = math.sqrt(
            len(node_ids) / TARGET_VISIBLE_NODES
        )

        spread_range *= density_scale

    # Generate well-separated starting positions for the layout algorithm.

    for node_id in node_ids:

        best_pos = None
        best_min_dist = 0.0

        for _ in range(50):

            candidate = Position(
                x=(random.random() - 0.5)
                  * spread_range,

                y=(random.random() - 0.5)
                  * spread_range,
            )

            if not used_positions:
                best_pos = candidate
                break

            min_dist_to_others = float("inf")

            for used in used_positions:
                dx = candidate.x - used.x
                dy = candidate.y - used.y

                dist = math.sqrt(
                    dx * dx +
                    dy * dy
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
                best_pos = candidate

            if (
                    min_dist_to_others
                    > min_distance * 1.5
            ):
                break

        pos = best_pos or Position(
            x=(random.random() - 0.5)
              * spread_range,

            y=(random.random() - 0.5)
              * spread_range,
        )

        used_positions.append(
            pos
        )

        positions[node_id] = pos


def normalize_positions(
        positions: list,
        viewport_width: float = VIEWPORT_WIDTH,
        viewport_height: float = VIEWPORT_HEIGHT,
        padding: float = VIEWPORT_PADDING,
):
    """
    Scale and center layout so it fits inside the target viewport.
    The layout shape is preserved and it is never enlarged.
    """

    if not positions:
        return positions

    xs = [
        p["position"]["x"]
        for p in positions
    ]

    ys = [
        p["position"]["y"]
        for p in positions
    ]

    min_x = min(xs)
    max_x = max(xs)

    min_y = min(ys)
    max_y = max(ys)

    width = max(
        max_x - min_x,
        1.0,
    )

    height = max(
        max_y - min_y,
        1.0,
    )

    available_width = max(
        viewport_width - padding * 2,
        1.0,
    )

    available_height = max(
        viewport_height - padding * 2,
        1.0,
    )

    MAX_UPSCALE = 2.0

    # Scale the layout to fit within the available viewport while preserving its shape.

    node_count = len(positions)

    fit_scale = min(
        available_width / width,
        available_height / height,
    )

    if node_count <= TARGET_MIN_VISIBLE_NODES:
        scale = min(fit_scale, MAX_UPSCALE)

    elif node_count <= TARGET_MAX_VISIBLE_NODES:
        scale = min(fit_scale, 1.0)

    else:
        overflow = node_count / TARGET_MAX_VISIBLE_NODES

        scale = max(
            fit_scale / math.sqrt(overflow),
            MAX_DOWNSCALE,
        )

    center_x = (min_x + max_x) / 2
    center_y = (min_y + max_y) / 2

    for node in positions:

        x = node["position"]["x"]
        y = node["position"]["y"]

        node["position"]["x"] = (
            x - center_x
        ) * scale

        node["position"]["y"] = (
            y - center_y
        ) * scale

    return positions