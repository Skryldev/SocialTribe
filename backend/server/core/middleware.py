import time

from fastapi import FastAPI, Request
from starlette.responses import Response

from utils.server_metrics import (
    HTTP_REQUEST_DURATION_SECONDS,
    HTTP_REQUESTS_IN_PROGRESS,
    HTTP_REQUESTS_TOTAL,
)


def register_prometheus_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def prometheus_middleware(
        request: Request,
        call_next,
    ) -> Response:

        if request.url.path == "/metrics":
            return await call_next(request)

        HTTP_REQUESTS_IN_PROGRESS.inc()

        start_time = time.perf_counter()

        status = 500
        route = "unmatched"

        try:
            response = await call_next(request)

            status = response.status_code

            route_obj = request.scope.get("route")
            if route_obj is not None:
                route = route_obj.path

            return response

        finally:
            duration = time.perf_counter() - start_time

            HTTP_REQUESTS_TOTAL.labels(
                method=request.method,
                route=route,
                status=str(status),
            ).inc()

            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=request.method,
                route=route,
                status=str(status),
            ).observe(duration)

            HTTP_REQUESTS_IN_PROGRESS.dec()