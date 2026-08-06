from pydantic import BaseModel
from typing import Any


class QueryRequest(BaseModel):

    plan: dict


class QueryStatistics(BaseModel):

    scanned: int = 0

    traversed: int = 0

    filtered: int = 0

    execution_time_ms: float = 0


class QueryResult(BaseModel):

    rows: list[dict[str, Any]]

    columns: list[str]

    statistics: QueryStatistics


class QueryResponse(BaseModel):

    success: bool = True

    data: QueryResult