from collections import deque
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class PriorityContext:

    level1: set[str] = field(
        default_factory=set
    )

    level2: set[str] = field(
        default_factory=set
    )

    level3: set[str] = field(
        default_factory=set
    )


@dataclass
class GraphAnalysisState:

    metadata_dirty: bool = False
    weights_dirty: bool = False

    analysis_running: bool = False
    pending_rebuild: bool = False

    progress: int = 0

    dirty_nodes: set[str] = field(
        default_factory=set
    )

    dirty_edges: set[str] = field(
        default_factory=set
    )

    affected_nodes: set[str] = field(
        default_factory=set
    )

    affected_edges: set[str] = field(
        default_factory=set
    )

    priority_context: PriorityContext = field(
        default_factory=PriorityContext
    )

    analytics_queue: deque = field(
        default_factory=deque
    )

    running_stage: int = 0

    completed_stages: set[int] = field(
        default_factory=set
    )

    generation: int = 0

    last_rebuild: datetime | None = None

    viewport_nodes: set[str] = field(
        default_factory=set
    )

    viewport_priority_enabled: bool = True

    viewport_generation: int = 0
    last_viewport_generation: int = -1