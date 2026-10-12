import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

# Mock de python-magic: libmagic no está disponible en Windows.
sys.modules.setdefault("magic", MagicMock())

from app import pipeline
from app.errors import PermanentError, RetryableError


@pytest.fixture
def publisher():
    mock = MagicMock()
    mock.publish_progress = AsyncMock()
    return mock


@pytest.fixture
def event():
    return {
        "mediaId": "media-123",
        "userId": "user-456",
        "bucket": "uploads",
        "objectKey": "sample.mp4",
        "eventId": "event-789",
        "attempt": 1,
    }


@pytest.mark.asyncio
async def test_process_media_success(event, publisher, monkeypatch):
    download = AsyncMock()
    monkeypatch.setattr(pipeline, "download_object", download)
    monkeypatch.setattr(pipeline, "update_media_status", AsyncMock())
    monkeypatch.setattr(pipeline, "validate_file_type", MagicMock())
    monkeypatch.setattr(pipeline, "enforce_duration_limit", AsyncMock())
    monkeypatch.setattr(pipeline, "extract_audio", AsyncMock())

    monkeypatch.setattr(
        pipeline,
        "transcribe_audio",
        AsyncMock(return_value={
            "text": "Transcript",
            "segments": [{"start": 0, "end": 1, "text": "Transcript"}],
        }),
    )
    monkeypatch.setattr(
        pipeline,
        "summarize_transcript",
        AsyncMock(return_value={
            "summary": "Summary",
            "keywords": ["test"],
        }),
    )
    save_result = AsyncMock()
    monkeypatch.setattr(pipeline, "save_transcription_result", save_result)

    await pipeline.process_media(event, publisher)

    download.assert_awaited_once()
    pipeline.update_media_status.assert_awaited_once_with(
        "media-123", "PROCESSING"
    )
    save_result.assert_awaited_once_with(
        "media-123",
        "Transcript",
        "Summary",
        ["test"],
        [{"start": 0, "end": 1, "text": "Transcript"}],
    )
    assert [
        call.args[2]
        for call in publisher.publish_progress.await_args_list
    ] == [
        "DOWNLOADING",
        "EXTRACTING_AUDIO",
        "TRANSCRIBING",
        "SUMMARIZING",
        "DONE",
    ]


@pytest.mark.asyncio
async def test_common_pipeline_marks_permanent_failure(
    publisher, monkeypatch
):
    update_status = AsyncMock()
    monkeypatch.setattr(pipeline, "update_media_status", update_status)
    monkeypatch.setattr(
        pipeline, "validate_file_type",
        MagicMock(side_effect=PermanentError("unsupported file")),
    )

    with pytest.raises(PermanentError, match="unsupported file"):
        await pipeline._run_common_pipeline(
            "media-123", "user-456", "input.mp4", publisher, {}
        )

    update_status.assert_awaited_once_with("media-123", "FAILED")
    publisher.publish_progress.assert_awaited_once_with(
        "media-123",
        "user-456",
        "FAILED",
        0,
        message="unsupported file",
    )


@pytest.mark.asyncio
async def test_common_pipeline_propagates_retryable_failure(
    publisher, monkeypatch
):
    monkeypatch.setattr(pipeline, "validate_file_type", MagicMock())
    monkeypatch.setattr(pipeline, "enforce_duration_limit", AsyncMock())
    monkeypatch.setattr(
        pipeline, "extract_audio",
        AsyncMock(side_effect=RetryableError("temporary failure")),
    )
    update_status = AsyncMock()
    monkeypatch.setattr(pipeline, "update_media_status", update_status)

    with pytest.raises(RetryableError, match="temporary failure"):
        await pipeline._run_common_pipeline(
            "media-123", "user-456", "input.mp4", publisher, {}
        )

    update_status.assert_not_awaited()
    publisher.publish_progress.assert_awaited_once_with(
        "media-123", "user-456", "EXTRACTING_AUDIO", 35
    )


@pytest.mark.asyncio
async def test_common_pipeline_wraps_unexpected_failure(
    publisher, monkeypatch
):
    monkeypatch.setattr(
        pipeline, "validate_file_type",
        MagicMock(side_effect=RuntimeError("unexpected")),
    )
    update_status = AsyncMock()
    monkeypatch.setattr(pipeline, "update_media_status", update_status)

    with pytest.raises(RetryableError, match="unexpected"):
        await pipeline._run_common_pipeline(
            "media-123", "user-456", "input.mp4", publisher, {}
        )

    update_status.assert_not_awaited()
    publisher.publish_progress.assert_not_awaited()
