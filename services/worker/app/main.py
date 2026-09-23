import asyncio
import logging

from pythonjsonlogger import jsonlogger

from app.db.connection import close_pool
from app.messaging.consumer import start_consumer

logging.basicConfig(level=logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter())
logging.getLogger().handlers = [handler]

logger = logging.getLogger(__name__)


async def main():
    logger.info("Starting MediaFlow Worker...")
    try:
        await start_consumer()
        await asyncio.Future()  # corre para siempre
    finally:
        await close_pool()


if __name__ == "__main__":
    asyncio.run(main())