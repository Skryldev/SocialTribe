from pydantic import BaseModel, Field


class LogFilters(
    BaseModel,
):
    service: list[str] = []
    level: list[str] = []


class LogSort(
    BaseModel,
):
    field: str = "timestamp"
    order: str = "desc"


class LogPagination(
    BaseModel,
):
    page: int = 1
    pageSize: int = Field(
        default=100,
        ge=1,
        le=1000,
    )


class LogHistoryRequest(
    BaseModel,
):
    filters: LogFilters
    sort: LogSort
    pagination: LogPagination