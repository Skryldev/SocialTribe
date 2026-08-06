from enum import Enum
from pydantic import BaseModel
from dataclasses import dataclass
from typing import Dict


@dataclass
class CentralityScores:
    degree: float
    betweenness: float
    closeness: float
    eigenvector: float
    pagerank: float
    harmonic: float
    overall: float
    role: str


@dataclass
class EdgeWeightResult:
    edge_id: str
    source: str
    target: str
    raw_score: float      # 0-1
    weight: int           # 0-100
    components: Dict[str, float]


class InfluenceMethod(
    str,
    Enum,
):
    OPTIMAL = "optimal"
    DEGREE = "degree"
    RANDOM = "random"


class InfluenceMaximizationRequest(
    BaseModel,
):
    k: int = 5
    method: InfluenceMethod = (
        InfluenceMethod.OPTIMAL
    )


class ShortestPathRequest(BaseModel):
    source_id: str
    target_id: str


class ShortestPathResponse(BaseModel):
    is_directed: bool
    path: list[str]
    message: str

class CommonNeighborsRequest(BaseModel):
    source_id: str
    target_id: str


class CommonNeighborsResponse(BaseModel):
    has_common_friend: bool
    count: int
    common_neighbors: list[str]
    message: str