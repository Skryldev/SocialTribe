from dataclasses import dataclass

@dataclass(slots=True)
class SpatialNode:
    id: str
    x: float
    y: float