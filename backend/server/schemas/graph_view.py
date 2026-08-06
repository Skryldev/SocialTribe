from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Position(BaseModel):
    x: float
    y: float


class NodeData(BaseModel):
    id: str
    name: str

    nodeType: str = "socialUser"
    role: str = "normal"

    friendCount: int = 0
    avgDistance: float = 0.0
    centrality: float = 0.0


class Node(BaseModel):
    id: str
    type: str = "socialUser"

    position: Position

    data: NodeData


class EdgeData(BaseModel):
    Weight: int = Field(
        default=50,
        ge=0,
        le=100
    )

    createdAt: Optional[datetime] = None

    id: str
    targetId: str


class Edge(BaseModel):
    id: str

    source: str
    target: str

    type: str = "weightedEdge"

    data: EdgeData


class GraphData(BaseModel):
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)


class ViewportRequest(BaseModel):
    x: float
    y: float

    width: float
    height: float

    zoom: float


class ViewportResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


class ViewportResponseWithMetadata(BaseModel):
    nodes: List[Node]
    metadata: Dict[str, Any]
    edges: List[Edge]
