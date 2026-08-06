from typing import Dict, List

from pydantic import BaseModel, Field


# ---------- Requests ----------

class SimulationRunRequest(BaseModel):
    model: str = "wave"
    probability: float = 0.3
    threshold: int = 2
    maxTicks: int = 100


# ---------- Responses ----------

class NodeUpdate(BaseModel):
    id: str
    status: str


class DayStats(BaseModel):
    totalNodes: int
    informed: int
    spreaders: int
    ignorant: int
    coverage: float


class SimulationDayResponse(BaseModel):
    day: int
    nodeUpdates: List[NodeUpdate]
    stats: DayStats


class SimulationStateResponse(BaseModel):
    days: List[SimulationDayResponse]
    totalDays: int
    totalTicks: int
    finalCoverage: float