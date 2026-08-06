from typing import Any

from pydantic import BaseModel


class LayoutRequest(BaseModel):
    algorithm: str
    params: dict[str, Any] = {}


class LayoutNodeResponse(BaseModel):
    id: str
    position: dict[str, float]


class LayoutResponse(BaseModel):
    nodes: list[LayoutNodeResponse]
    algorithm: str
    executionTimeMs: float