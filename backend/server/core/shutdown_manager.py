import os
import signal
import threading
from logger_config import get_logger

logger = get_logger(__name__)


def shutdown_server():

    logger.warning(
        "Shutdown requested via API."
    )

    # Delay signal delivery so the API response
    # can be returned before shutting down.

    def _shutdown():
        logger.warning(
            "Sending SIGINT to current process..."
        )
        os.kill(
            os.getpid(),
            signal.SIGINT,
        )

    # Schedule the shutdown outside the current request thread.

    threading.Timer(
        0.5,
        _shutdown,
    ).start()