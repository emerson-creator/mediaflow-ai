import json
import logging
from datetime import datetime, timezone

import aio_pika
from aio_pika.abc import AbstractExchange, AbstractIncomingMessage

from app.config import settings
from app.db.repository import get_media_status
from app.errors import PermanentError, RetryableError
from app.messaging.publisher import ProgressPublisher
from app.pipeline import process_media

logger = logging.getLogger(__name__)

# (routing key, TTL in ms). Index = attempt that just failed - 1.
RETRY_TIERS = [
    ("retry.30s", 30_000),
    ("retry.2m", 120_000),
    ("retry.10m", 600_000),
]
MAX_ATTEMPTS = len(RETRY_TIERS) + 1  # 1 original + 3 retries = 4 total tries

RETRY_EXCHANGE = "mediaflow.retry"
DLX_EXCHANGE = "mediaflow.dlx"
DLQ_QUEUE = "worker.media.uploaded.dlq"
DLQ_ROUTING_KEY = "media.uploaded.dead"


async def setup_topology(channel: aio_pika.abc.AbstractChannel):
    """Declare the exchanges and queues for retry + DLQ. Idempotent."""
    events = await channel.declare_exchange(
        settings.exchange_name, aio_pika.ExchangeType.TOPIC, durable=True
    )
    retry_ex = await channel.declare_exchange(
        RETRY_EXCHANGE, aio_pika.ExchangeType.DIRECT, durable=True
    )
    dlx = await channel.declare_exchange(
        DLX_EXCHANGE, aio_pika.ExchangeType.DIRECT, durable=True
    )

    # Main queue: unchanged, so no PRECONDITION_FAILED on the existing one.
    main_queue = await channel.declare_queue(settings.upload_queue, durable=True)
    await main_queue.bind(events, routing_key="media.uploaded")

    # One waiting-room queue per backoff tier. Nobody consumes these; messages
    # sit until TTL expires, then dead-letter back into the main flow.
    for routing_key, ttl_ms in RETRY_TIERS:
        q = await channel.declare_queue(
            f"worker.{routing_key}",
            durable=True,
            arguments={
                "x-message-ttl": ttl_ms,
                "x-dead-letter-exchange": settings.exchange_name,
                "x-dead-letter-routing-key": "media.uploaded",
            },
        )
        await q.bind(retry_ex, routing_key=routing_key)

    dlq = await channel.declare_queue(DLQ_QUEUE, durable=True)
    await dlq.bind(dlx, routing_key=DLQ_ROUTING_KEY)

    return events, retry_ex, dlx, main_queue


async def _publish_to(exchange: AbstractExchange, routing_key: str, event: dict, headers: dict | None = None):
    await exchange.publish(
        aio_pika.Message(
            body=json.dumps(event).encode(),
            content_type="application/json",
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            headers=headers or {},
        ),
        routing_key=routing_key,
    )


async def handle_message(
    message: AbstractIncomingMessage,
    publisher: ProgressPublisher,
    retry_ex: AbstractExchange,
    dlx: AbstractExchange,
):
    # We ack/nack manually below, so we don't use `message.process()` here.
    try:
        event = json.loads(message.body)
    except json.JSONDecodeError:
        logger.error("Undecodable message, sending to DLQ", extra={"body": message.body[:200].decode(errors="replace")})
        await _publish_to(dlx, DLQ_ROUTING_KEY, {"raw": message.body.decode(errors="replace")}, {"x-failure-reason": "invalid_json"})
        await message.ack()
        return

    media_id = event.get("mediaId")
    attempt = event.get("attempt", 1)
    log_ctx = {"mediaId": media_id, "eventId": event.get("eventId"), "attempt": attempt}

    # ---- Idempotency ----
    # If this media is already DONE (duplicate delivery) or actively PROCESSING
    # from another worker, skip. Spending OpenAI credits twice is the real cost.
    status = await get_media_status(media_id)
    if status == "DONE":
        logger.info("Duplicate delivery, media already DONE; skipping", extra=log_ctx)
        await message.ack()
        return
    if status == "FAILED" and attempt == 1:
        logger.info("Media already FAILED permanently; skipping", extra=log_ctx)
        await message.ack()
        return

    try:
        await process_media(event, publisher)
        await message.ack()

    except PermanentError as exc:
        # Never retry. Straight to DLQ for inspection.
        logger.error("Permanent failure, sending to DLQ", extra={**log_ctx, "error": str(exc)})
        await _publish_to(
            dlx, DLQ_ROUTING_KEY, event,
            {"x-failure-reason": str(exc)[:500], "x-failure-type": "permanent",
             "x-failed-at": datetime.now(timezone.utc).isoformat()},
        )
        await message.ack()  # the DLQ copy is the record now; don't redeliver

    except RetryableError as exc:
        if attempt >= MAX_ATTEMPTS:
            # Retries exhausted. NOW it's a real failure the user should see.
            logger.error("Retries exhausted, sending to DLQ", extra={**log_ctx, "error": str(exc)})
            await update_failed(media_id, publisher, event, str(exc))
            await _publish_to(
                dlx, DLQ_ROUTING_KEY, event,
                {"x-failure-reason": str(exc)[:500], "x-failure-type": "retries_exhausted",
                 "x-failed-at": datetime.now(timezone.utc).isoformat()},
            )
            await message.ack()
        else:
            routing_key, ttl_ms = RETRY_TIERS[attempt - 1]
            logger.warning(
                "Scheduling message retry",
                extra={**log_ctx, "next_attempt": attempt + 1, "retry_in_seconds": ttl_ms // 1000},
            )
            retry_event = {**event, "attempt": attempt + 1}
            await _publish_to(retry_ex, routing_key, retry_event)
            await message.ack()  # the retry copy replaces this one


async def update_failed(media_id: str, publisher: ProgressPublisher, event: dict, reason: str):
    from app.db.repository import update_media_status
    await update_media_status(media_id, "FAILED")
    await publisher.publish_progress(
        media_id, event["userId"], "FAILED", 0,
        message=f"Processing failed after {MAX_ATTEMPTS} attempts: {reason}",
    )


async def start_consumer() -> None:
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=1)

    events, retry_ex, dlx, main_queue = await setup_topology(channel)
    publisher = ProgressPublisher(events)

    logger.info("Consumer ready", extra={"queue": settings.upload_queue, "max_attempts": MAX_ATTEMPTS})
    await main_queue.consume(lambda msg: handle_message(msg, publisher, retry_ex, dlx))