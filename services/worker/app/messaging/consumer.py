import json
import logging
from datetime import datetime, timezone

import aio_pika
from aio_pika.abc import AbstractExchange, AbstractIncomingMessage
from app.pipeline import process_youtube_media
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
    events = await channel.declare_exchange(
        settings.exchange_name, aio_pika.ExchangeType.TOPIC, durable=True
    )
    retry_ex = await channel.declare_exchange(
        RETRY_EXCHANGE, aio_pika.ExchangeType.DIRECT, durable=True
    )
    dlx = await channel.declare_exchange(
        DLX_EXCHANGE, aio_pika.ExchangeType.DIRECT, durable=True
    )

    main_queue = await channel.declare_queue(settings.upload_queue, durable=True)
    await main_queue.bind(events, routing_key="media.uploaded")
    await main_queue.bind(events, routing_key="media.youtube_requested")

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
    try:
        event = json.loads(message.body)
    except json.JSONDecodeError:
        logger.error("Undecodable message, sending to DLQ", extra={"body": message.body[:200].decode(errors="replace")})
        await _publish_to(dlx, DLQ_ROUTING_KEY, {"raw": message.body.decode(errors="replace")}, {"x-failure-reason": "invalid_json"})
        await message.ack()
        return

    # NEW: track which routing key this event originally came in on,
    # so retries dead-letter back to the correct handler (upload vs youtube).
    original_routing_key = event.get("_routingKey", message.routing_key)
    media_id = event.get("mediaId")
    attempt = event.get("attempt", 1)
    log_ctx = {"mediaId": media_id, "eventId": event.get("eventId"), "attempt": attempt}

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
        if original_routing_key == "media.youtube_requested":
            await process_youtube_media(event, publisher)
        else:
            await process_media(event, publisher)
        await message.ack()

    except PermanentError as exc:
        logger.error("Permanent failure, sending to DLQ", extra={**log_ctx, "error": str(exc)})
        await _publish_to(
            dlx, DLQ_ROUTING_KEY, event,
            {"x-failure-reason": str(exc)[:500], "x-failure-type": "permanent",
             "x-failed-at": datetime.now(timezone.utc).isoformat()},
        )
        await message.ack()

    except RetryableError as exc:
        if attempt >= MAX_ATTEMPTS:
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
            retry_event = {**event, "attempt": attempt + 1, "_routingKey": original_routing_key}

            await _publish_to(retry_ex, routing_key, retry_event)
            await message.ack()


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

    async def restore_topology(_connection) -> None:
        await setup_topology(channel)
        await main_queue.consume(lambda msg: handle_message(msg, publisher, retry_ex, dlx))
        logger.info("Consumer topology restored after RabbitMQ reconnect")

    connection.reconnect_callbacks.add(restore_topology)

    logger.info("Consumer ready", extra={"queue": settings.upload_queue, "max_attempts": MAX_ATTEMPTS})
    await main_queue.consume(lambda msg: handle_message(msg, publisher, retry_ex, dlx))