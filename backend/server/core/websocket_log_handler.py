import logging
import socket
from datetime import datetime

from core.log_stream import (
    log_stream,
)

class WebSocketLogHandler(
    logging.Handler,
):

    HOSTNAME = (
        socket.gethostname()
    )

    def emit(
            self,
            record,
    ):
        try:

            # Convert the log record into the payload expected by WebSocket log clients.

            data = {
                "level":
                    record.levelname.lower(),

                "timestamp":
                    datetime.now()
                    .astimezone()
                    .isoformat(
                        timespec="milliseconds"
                    ),

                "caller":
                    f"{record.pathname}:{record.lineno}",

                "message":
                    record.getMessage(),

                "environment":
                    "development",

                "hostname":
                    self.HOSTNAME,

                "module":
                    record.module,
            }

            # Merge structured metadata provided by the application.

            if hasattr(
                    record,
                    "extra_data",
            ):
                data.update(
                    record.extra_data
                )

            # Forward the formatted log entry to all connected clients.

            log_stream.push(
                data
            )

        except Exception:
            pass