import asyncio
import time

from pathlib import Path

HEARTBEAT_FILE = Path("/tmp/worker_heartbeat")


def write_heartbeat() -> None:
    HEARTBEAT_FILE.write_text(str(time.time()))


async def heartbeat_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        write_heartbeat()

        try:
            await asyncio.wait_for(
                stop_event.wait(),
                timeout=10,
            )
        except asyncio.TimeoutError:
            pass