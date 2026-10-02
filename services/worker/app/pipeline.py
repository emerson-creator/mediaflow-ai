import os
import logging
import tempfile
from pathlib import Path

from app.ai.summarization import summarize_transcript
from app.ai.transcription import transcribe_audio
from app.db.repository import (
    save_transcription_result,
    update_media_status,
    update_media_youtube_metadata,
)
from app.errors import PermanentError, RetryableError
from app.media.ffmpeg import enforce_duration_limit, extract_audio
from app.media.validation import validate_file_type
from app.media.youtube import (
    download_audio,
    enforce_youtube_duration_limit,
    fetch_metadata,
)
from app.messaging.publisher import ProgressPublisher
from app.retry import with_retry
from app.storage.minio_client import download_object, upload_object
from app.config import settings

logger = logging.getLogger(__name__)


async def process_media(event: dict, publisher: ProgressPublisher) -> None:
    """Entry point for uploads that are already in MinIO (source: UPLOAD)."""
    media_id = event["mediaId"]
    user_id = event["userId"]
    bucket = event["bucket"]
    object_key = event["objectKey"]
    log_ctx = _log_ctx(event)

    logger.info("Pipeline started (upload)", extra=log_ctx)
    await update_media_status(media_id, "PROCESSING")

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / "input"

        await publisher.publish_progress(media_id, user_id, "DOWNLOADING", 10)
        await with_retry(
            lambda: download_object(bucket, object_key, str(input_path)),
            name="download", log_ctx=log_ctx,
        )

        await _run_common_pipeline(media_id, user_id, str(input_path), publisher, log_ctx)


async def process_youtube_media(event: dict, publisher: ProgressPublisher) -> None:
    """Entry point for YouTube requests: fetch metadata, download audio,
    upload to MinIO, then hand off to the same common pipeline as uploads.
    """
    media_id = event["mediaId"]
    user_id = event["userId"]
    source_url = event["sourceUrl"]
    log_ctx = _log_ctx(event)

    logger.info("Pipeline started (youtube)", extra=log_ctx)

    await publisher.publish_progress(media_id, user_id, "FETCHING_METADATA", 5)
    metadata = await with_retry(
        lambda: fetch_metadata(source_url), name="youtube_metadata", log_ctx=log_ctx,
    )
    enforce_youtube_duration_limit(metadata)  # PermanentError if too long — before any download

    title = metadata.get("title", source_url)
    thumbnail_url = metadata.get("thumbnail", "")
    logger.info("Metadata fetched", extra={**log_ctx, "title": title, "duration": metadata.get("duration")})

    with tempfile.TemporaryDirectory() as tmp_dir:
        await publisher.publish_progress(media_id, user_id, "DOWNLOADING", 15)
        downloaded_path = await with_retry(
            lambda: download_audio(source_url, tmp_dir), name="youtube_download", log_ctx=log_ctx,
        )

        # Validate content type BEFORE spending a MinIO upload on it.
        validate_file_type(downloaded_path)

        size_bytes = os.path.getsize(downloaded_path)
        ext = Path(downloaded_path).suffix.lstrip(".")
        object_key = f"uploads/{user_id}/{media_id}/youtube_audio.{ext}"
        bucket = settings.minio_bucket

        await with_retry(
            lambda: upload_object(bucket, object_key, downloaded_path),
            name="upload_to_storage", log_ctx=log_ctx,
        )

        await update_media_youtube_metadata(
            media_id, title, thumbnail_url, object_key, f"audio/{ext}", size_bytes
        )

        await _run_common_pipeline(media_id, user_id, downloaded_path, publisher, log_ctx)


async def _run_common_pipeline(
    media_id: str, user_id: str, input_path: str, publisher: ProgressPublisher, log_ctx: dict
) -> None:
    """Shared from here on: validate → (extract audio if needed) →
    transcribe → summarize → save. Both entry points converge here.
    """
    try:
        validate_file_type(input_path)
        await enforce_duration_limit(input_path)

        # YouTube audio is already audio-only; re-extracting with ffmpeg is
        # cheap and normalizes it to the exact format Whisper expects
        # (mono, 16kHz), same as the upload path. Simpler than branching.
        audio_path = f"{input_path}.normalized.wav"
        await publisher.publish_progress(media_id, user_id, "EXTRACTING_AUDIO", 35)
        await extract_audio(input_path, audio_path)

        await publisher.publish_progress(media_id, user_id, "TRANSCRIBING", 55)
        transcript_result = await with_retry(
            lambda: transcribe_audio(audio_path), name="whisper", log_ctx=log_ctx,
        )

        transcript = transcript_result["text"]
        segments = transcript_result["segments"]
        

        await publisher.publish_progress(media_id, user_id, "SUMMARIZING", 85)
        result = await with_retry(
            lambda: summarize_transcript(transcript), name="summarize", log_ctx=log_ctx,
        )

        await save_transcription_result(media_id, transcript, result["summary"], result["keywords"], segments)

        await publisher.publish_progress(media_id, user_id, "DONE", 100)
        logger.info("Pipeline completed", extra=log_ctx)

    except PermanentError as exc:
        logger.error("Permanent failure", extra={**log_ctx, "error": str(exc)})
        await update_media_status(media_id, "FAILED")
        await publisher.publish_progress(media_id, user_id, "FAILED", 0, message=str(exc))
        raise

    except RetryableError as exc:
        logger.warning("Retryable failure", extra={**log_ctx, "error": str(exc)})
        raise

    except Exception as exc:
        logger.exception("Unclassified failure, treating as retryable", extra=log_ctx)
        raise RetryableError(str(exc)) from exc


def _log_ctx(event: dict) -> dict:
    return {
        "mediaId": event["mediaId"],
        "eventId": event.get("eventId"),
        "userId": event["userId"],
        "attempt": event.get("attempt", 1),
    }