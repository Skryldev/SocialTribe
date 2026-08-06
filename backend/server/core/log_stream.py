from collections import deque
import asyncio


class LogStream:

    def __init__(
            self,
            max_logs: int = 100,
    ):

        # Keep a bounded history so newly connected clients
        # can receive recent log entries immediately.

        self.buffer = deque(
            maxlen=max_logs,
        )

        self.connections = set()

        self.loop = None

    def set_loop(
            self,
            loop,
    ):
        self.loop = loop

    async def connect(
            self,
            websocket,
    ):
        await websocket.accept()

        self.connections.add(
            websocket
        )

        # Replay buffered logs to initialize the new client.

        for log in self.buffer:
            await websocket.send_json(
                log
            )

    def disconnect(
            self,
            websocket,
    ):
        self.connections.discard(
            websocket
        )

    def push(
            self,
            record: dict,
    ):
        self.buffer.append(
            record
        )

        # Skip broadcasting when the event loop is unavailable
        # or no clients are currently connected.

        if (
                self.loop is None
                or
                not self.connections
        ):
            return

        asyncio.run_coroutine_threadsafe(
            self.broadcast(
                record
            ),
            self.loop,
        )

    async def broadcast(
            self,
            record,
    ):

        # Track disconnected clients and remove them
        # after broadcasting completes.

        dead = []

        for ws in self.connections:
            try:
                await ws.send_json(
                    record
                )
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(
                ws
            )


log_stream = LogStream()
