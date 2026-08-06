from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any


# ============ Types ============
class SimStatus(str, Enum):
    IGNORANT = "ignorant"
    SPREADER = "spreader"
    INFORMED = "informed"
    STIFLER = "stifler"


class PropagationModel(str, Enum):
    WAVE = "wave"
    RANDOM = "random"
    THRESHOLD = "threshold"
    WEIGHTED = "weighted"


@dataclass
class SimulationDay:
    day: int
    node_updates: List[Dict[str, Any]]
    stats: Dict[str, Any]


@dataclass
class SimulationState:
    statuses: Dict[str, SimStatus]

    current_day: int = 0

    coverage: float = 0

    is_complete: bool = False

    timeline: List[SimulationDay] = field(
        default_factory=list
    )


@dataclass
class TickResult:
    next_statuses: Dict[str, SimStatus]
    newly_informed: int
    active_spreaders: int
    changes: List[Dict[str, Any]]