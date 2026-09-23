import logging
from datetime import datetime, timezone

import aio_pika

logger = logging.getLogger(__name__)


class ProgressPublisher:
    """we use the same channel/exchange as the consumer to publish progress."""

    def __init__(self, exchange: aio_pika.abc.AbstractExchange):
        self._exchange = exchange

    async def publish_progress(
        self, media_id: str, user_id: str, stage: str, progress: int, message: str = ""
    ) -> None:
        payload = {
            "mediaId": media_id,
            "userId": user_id,
            "stage": stage,
            "progress": progress,
            "message": message,
            "occurredAt": datetime.now(timezone.utc).isoformat(),
        }
        import json

        msg = aio_pika.Message(
            body=json.dumps(payload).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await self._exchange.publish(msg, routing_key="media.progress.updated")
        logger.info(f"Progress published: {stage} ({progress}%)")