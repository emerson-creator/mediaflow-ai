import asyncio
import logging

from pythonjsonlogger import jsonlogger

from app.db.connection import close_pool
from app.health import heartbeat_loop
from app.messaging.consumer import start_consumer
from prometheus_client import start_http_server

logging.basicConfig(level=logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter())
logging.getLogger().handlers = [handler]

logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting MediaFlow Worker...")

    start_http_server(8000)

    stop_event = asyncio.Event()
    heartbeat_task = asyncio.create_task(
        heartbeat_loop(stop_event)
    )

    try:
        await start_consumer()
        await asyncio.Future()

    finally:
        stop_event.set()

        heartbeat_task.cancel()

        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

        await close_pool()
        logger.info("MediaFlow Worker stopped.")


if __name__ == "__main__":
    asyncio.run(main())