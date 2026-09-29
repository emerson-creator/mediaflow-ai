import logging
import tempfile
from pathlib import Path

from app.ai.summarization import summarize_transcript
from app.ai.transcription import transcribe_audio
from app.db.repository import save_transcription_result, update_media_status
from app.errors import PermanentError, PipelineError, RetryableError
from app.media.ffmpeg import extract_audio
from app.messaging.publisher import ProgressPublisher
from app.retry import with_retry
from app.storage.minio_client import download_object

logger = logging.getLogger(__name__)


async def process_media(event: dict, publisher: ProgressPublisher) -> None:
    media_id = event["mediaId"]
    user_id = event["userId"]
    bucket = event["bucket"]
    object_key = event["objectKey"]
    log_ctx = {
        "mediaId": media_id,
        "eventId": event.get("eventId"),
        "userId": user_id,
        "attempt": event.get("attempt", 1),
    }

    logger.info("Pipeline started", extra=log_ctx)
    await update_media_status(media_id, "PROCESSING")

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / "input"
        audio_path = tmp_path / "audio.wav"

        try:
            await publisher.publish_progress(media_id, user_id, "DOWNLOADING", 10)
            await with_retry(
                lambda: download_object(bucket, object_key, str(input_path)),
                name="download", log_ctx=log_ctx,
            )

            await publisher.publish_progress(media_id, user_id, "EXTRACTING_AUDIO", 30)
            await extract_audio(str(input_path), str(audio_path))  # PermanentError on failure

            await publisher.publish_progress(media_id, user_id, "TRANSCRIBING", 50)
            transcript = await with_retry(
                lambda: transcribe_audio(str(audio_path)),
                name="whisper", log_ctx=log_ctx,
            )

            await publisher.publish_progress(media_id, user_id, "SUMMARIZING", 80)
            result = await with_retry(
                lambda: summarize_transcript(transcript),
                name="summarize", log_ctx=log_ctx,
            )

            await save_transcription_result(
                media_id, transcript, result["summary"], result["keywords"]
            )

            await publisher.publish_progress(media_id, user_id, "DONE", 100)
            logger.info("Pipeline completed", extra=log_ctx)

        except PermanentError as exc:
            # Will never succeed. Mark FAILED now, tell the user, let the consumer send to DLQ.
            logger.error("Permanent failure", extra={**log_ctx, "error": str(exc)})
            await update_media_status(media_id, "FAILED")
            await publisher.publish_progress(media_id, user_id, "FAILED", 0, message=str(exc))
            raise

        except RetryableError as exc:
            # Might work later. Do NOT mark FAILED or notify the user as failed yet:
            # the consumer decides between retry queue and DLQ based on attempt count.
            logger.warning("Retryable failure", extra={**log_ctx, "error": str(exc)})
            raise

        except Exception as exc:
            # Unclassified: be conservative and treat as retryable. A bug in our own
            # code shouldn't permanently kill a user's file on the first occurrence.
            logger.exception("Unclassified failure, treating as retryable", extra=log_ctx)
            raise RetryableError(str(exc)) from exc