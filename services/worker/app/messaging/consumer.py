import json
import logging

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from app.config import settings
from app.messaging.publisher import ProgressPublisher
from app.pipeline import process_media

logger = logging.getLogger(__name__)


async def handle_message(message: AbstractIncomingMessage, publisher: ProgressPublisher):
    # ack manual: solo confirmamos si el pipeline completa sin excepción
    async with message.process(requeue=False, ignore_processed=True):
        try:
            event = json.loads(message.body)
            logger.info(f"Message received: {event.get('mediaId')}")
            await process_media(event, publisher)
        except Exception:
            # Ya logueamos dentro de process_media.
            # requeue=False evita loop infinito con un mensaje "envenenado".
            # (la Fase de DLQ/retries la vemos más adelante si hace falta)
            logger.error("Message processing failed, message will be discarded.")


async def start_consumer() -> None:
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=1)  # 1 tarea a la vez por worker

    exchange = await channel.declare_exchange(
        settings.exchange_name, aio_pika.ExchangeType.TOPIC, durable=True
    )

    queue = await channel.declare_queue(settings.upload_queue, durable=True)
    await queue.bind(exchange, routing_key="media.uploaded")

    publisher = ProgressPublisher(exchange)

    logger.info(f"Listening to queue '{settings.upload_queue}'...")
    await queue.consume(lambda msg: handle_message(msg, publisher))