import json
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

# Mock de python-magic: libmagic no está disponible en Windows.
sys.modules.setdefault("magic", MagicMock())

from app.messaging import consumer
from app.errors import PermanentError, RetryableError


@pytest.fixture
def publisher():
    mock = MagicMock()
    mock.publish_progress = AsyncMock()
    return mock


@pytest.fixture
def message():
    mock = MagicMock()
    mock.body = json.dumps({
        "mediaId": "media-123",
        "userId": "user-456",
        "bucket": "uploads",
        "objectKey": "sample.mp4",
        "eventId": "event-789",
        "attempt": 1,
    }).encode()
    mock.routing_key = "media.uploaded"
    mock.ack = AsyncMock()
    return mock


@pytest.fixture
def exchanges():
    return MagicMock(), MagicMock()


@pytest.fixture(autouse=True)
def mock_metrics(monkeypatch):
    for name in (
        "jobs_active",
        "jobs_total",
        "job_duration_seconds",
        "retries_total",
        "dlq_total",
    ):
        monkeypatch.setattr(consumer, name, MagicMock())


@pytest.mark.asyncio
async def test_handle_message_success(message, publisher, exchanges, monkeypatch):
    retry_ex, dlx = exchanges
    monkeypatch.setattr(consumer, "get_media_status", AsyncMock(return_value="PROCESSING"))
    process = AsyncMock()
    monkeypatch.setattr(consumer, "process_media", process)
    publish = AsyncMock()
    monkeypatch.setattr(consumer, "_publish_to", publish)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    process.assert_awaited_once()
    message.ack.assert_awaited_once()
    publish.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_message_skips_done_media(message, publisher, exchanges, monkeypatch):
    retry_ex, dlx = exchanges
    monkeypatch.setattr(consumer, "get_media_status", AsyncMock(return_value="DONE"))
    process = AsyncMock()
    monkeypatch.setattr(consumer, "process_media", process)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    process.assert_not_awaited()
    message.ack.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_message_sends_permanent_failure_to_dlq(message, publisher, exchanges, monkeypatch):
    retry_ex, dlx = exchanges
    monkeypatch.setattr(consumer, "get_media_status", AsyncMock(return_value="PROCESSING"))
    monkeypatch.setattr(
        consumer, "process_media",
        AsyncMock(side_effect=PermanentError("unsupported media")),
    )
    publish = AsyncMock()
    monkeypatch.setattr(consumer, "_publish_to", publish)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    publish.assert_awaited_once()
    args = publish.await_args.args
    assert args[0] is dlx
    assert args[1] == consumer.DLQ_ROUTING_KEY
    assert args[2]["mediaId"] == "media-123"
    assert args[3]["x-failure-type"] == "permanent"
    message.ack.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_message_schedules_retry(message, publisher, exchanges, monkeypatch):
    retry_ex, dlx = exchanges
    monkeypatch.setattr(consumer, "get_media_status", AsyncMock(return_value="PROCESSING"))
    monkeypatch.setattr(
        consumer, "process_media",
        AsyncMock(side_effect=RetryableError("temporary outage")),
    )
    publish = AsyncMock()
    monkeypatch.setattr(consumer, "_publish_to", publish)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    publish.assert_awaited_once()
    args = publish.await_args.args
    assert args[0] is retry_ex
    assert args[1] == "retry.30s"
    assert args[2]["attempt"] == 2
    assert args[2]["_routingKey"] == "media.uploaded"
    message.ack.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_message_sends_invalid_json_to_dlq(message, publisher, exchanges, monkeypatch):
    retry_ex, dlx = exchanges
    message.body = b"{invalid-json"
    publish = AsyncMock()
    monkeypatch.setattr(consumer, "_publish_to", publish)
    get_status = AsyncMock()
    monkeypatch.setattr(consumer, "get_media_status", get_status)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    publish.assert_awaited_once()
    args = publish.await_args.args
    assert args[0] is dlx
    assert args[1] == consumer.DLQ_ROUTING_KEY
    assert args[2]["raw"] == "{invalid-json"
    assert args[3]["x-failure-reason"] == "invalid_json"
    message.ack.assert_awaited_once()
    get_status.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_message_exhausted_retries_marks_failed(message, publisher, exchanges, monkeypatch):
    retry_ex, dlx = exchanges
    event = json.loads(message.body)
    event["attempt"] = consumer.MAX_ATTEMPTS
    message.body = json.dumps(event).encode()

    monkeypatch.setattr(consumer, "get_media_status", AsyncMock(return_value="PROCESSING"))
    monkeypatch.setattr(
        consumer, "process_media",
        AsyncMock(side_effect=RetryableError("still unavailable")),
    )
    update_failed = AsyncMock()
    monkeypatch.setattr(consumer, "update_failed", update_failed)
    publish = AsyncMock()
    monkeypatch.setattr(consumer, "_publish_to", publish)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    update_failed.assert_awaited_once_with(
        "media-123", publisher, event, "still unavailable"
    )
    publish.assert_awaited_once()
    args = publish.await_args.args
    assert args[0] is dlx
    assert args[3]["x-failure-type"] == "retries_exhausted"
    message.ack.assert_awaited_once()

@pytest.mark.asyncio
async def test_handle_message_skips_failed_media_on_first_attempt(
    message, publisher, exchanges, monkeypatch
):
    retry_ex, dlx = exchanges
    monkeypatch.setattr(
        consumer, "get_media_status", AsyncMock(return_value="FAILED")
    )
    process = AsyncMock()
    monkeypatch.setattr(consumer, "process_media", process)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    process.assert_not_awaited()
    message.ack.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_message_processes_youtube_event(
    message, publisher, exchanges, monkeypatch
):
    retry_ex, dlx = exchanges
    event = json.loads(message.body)
    event["_routingKey"] = "media.youtube_requested"
    message.body = json.dumps(event).encode()
    message.routing_key = "media.uploaded"

    monkeypatch.setattr(
        consumer, "get_media_status", AsyncMock(return_value="PROCESSING")
    )
    process_youtube = AsyncMock()
    process_upload = AsyncMock()
    monkeypatch.setattr(consumer, "process_youtube_media", process_youtube)
    monkeypatch.setattr(consumer, "process_media", process_upload)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    process_youtube.assert_awaited_once_with(event, publisher)
    process_upload.assert_not_awaited()
    consumer.jobs_total.labels.assert_called_with(
        source_type="youtube", result="success"
    )
    message.ack.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_message_increments_retry_metric(
    message, publisher, exchanges, monkeypatch
):
    retry_ex, dlx = exchanges
    monkeypatch.setattr(
        consumer, "get_media_status", AsyncMock(return_value="PROCESSING")
    )
    monkeypatch.setattr(
        consumer,
        "process_media",
        AsyncMock(side_effect=RetryableError("temporary outage")),
    )
    publish = AsyncMock()
    monkeypatch.setattr(consumer, "_publish_to", publish)

    await consumer.handle_message(message, publisher, retry_ex, dlx)

    consumer.retries_total.inc.assert_called_once_with()
    message.ack.assert_awaited_once()
