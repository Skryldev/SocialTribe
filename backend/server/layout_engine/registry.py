from .natural import natural_layout
from .random_layout import random_layout
from .grid_layout import grid_layout
from .circular_layout import circular_layout
from .radial_layout import radial_layout
from .concentric_layout import concentric_layout
from .kamada_kawai_layout import (
    kamada_kawai_layout
)
from .force_directed_layout import (
    force_directed_layout
)
from .force_atlas2_layout import (
    force_atlas2_layout
)
from .spectral_layout import spectral_layout


LAYOUT_ALGORITHMS = {
    "Natural":
        natural_layout,

    "Random Test":
        random_layout,

    "Clean Grid":
        grid_layout,

    "Ring":
        circular_layout,

    "Ego Network":
        radial_layout,

    "Centrality Focus":
        concentric_layout,

    "Publication Ready":
        kamada_kawai_layout,

    "Spread Out":
        force_directed_layout,

    "Tight Clusters":
        force_atlas2_layout,

    "Community View":
    spectral_layout,
}