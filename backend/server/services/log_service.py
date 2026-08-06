import json

from logger_config import get_logger
from utils.app_paths import AppPaths
from core.exceptions import LogQueryError

logger = get_logger(__name__)


class LogService:

    def query_logs(
            self,
            filters,
            sort,
            pagination,
    ):
        try:

            logger.info(
                "Log query "
                "services=%s page=%d size=%d",
                filters.service,
                pagination.page,
                pagination.pageSize,
            )

            records = []

            base = AppPaths.get_logs_dir()

            services = (
                filters.service
                or ["main"]
            )

            levels = {
                x.lower()
                for x in filters.level
            }

            for service in services:

                path = (
                    base
                    / service
                    / "app.jsonl"
                )

                if not path.exists():
                    continue

                with open(
                        path,
                        "r",
                        encoding="utf8",
                ) as f:

                    for line in f:
                        line = line.strip()

                        if not line:
                            continue

                        try:
                            record = json.loads(
                                line
                            )
                        except Exception:
                            continue

                        if (
                                levels
                                and
                                record.get("level")
                                not in levels
                        ):
                            continue

                        records.append(
                            {
                                "timestamp":
                                    record.get(
                                        "timestamp"
                                    ),
                                "level":
                                    record.get(
                                        "level"
                                    ),
                                "message":
                                    record.get(
                                        "message"
                                    ),
                                "module":
                                    record.get(
                                        "module"
                                    ),
                            }
                        )

            reverse = (
                sort.order.lower() == "desc"
            )

            records.sort(
                key=lambda x:
                x.get(
                    sort.field,
                    "",
                ),
                reverse=reverse,
            )

            total = len(records)

            page = pagination.page
            size = pagination.pageSize

            start = ((page - 1) * size)
            end = start + size

            return {
                "items":
                    records[start:end],

                "pagination": {
                    "page":
                        page,

                    "pageSize":
                        size,

                    "total":
                        total,

                    "totalPages":
                        (total + size - 1) // size
                }
            }

        except Exception as e:

            logger.exception(
                "Log query failed"
            )

            raise LogQueryError(
                "Failed to query logs.",
                details={
                    "reason": str(e),
                },
            ) from e


log_service = LogService()