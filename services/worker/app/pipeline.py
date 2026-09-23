import logging
import tempfile
from pathlib import Path

from app.ai.summarization import summarize_transcript
from app.ai.transcription import transcribe_audio
from app.db.repository import save_transcription_result, update_media_status
from app.media.ffmpeg import extract_audio
from app.messaging.publisher import ProgressPublisher
from app.storage.minio_client import download_object

logger = logging.getLogger(__name__)


class PipelineError(Exception):
    pass


async def process_media(event: dict, publisher: ProgressPublisher) -> None:
    media_id = event["mediaId"]
    user_id = event["userId"]
    bucket = event["bucket"]
    object_key = event["objectKey"]

    logger.info(f"Starting pipeline for media {media_id}")

    await update_media_status(media_id, "PROCESSING")

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / "input"
        audio_path = tmp_path / "audio.wav"

        try:
            # 1. Download from MinIO
            await publisher.publish_progress(media_id, user_id, "DOWNLOADING", 10)
            await download_object(bucket, object_key, str(input_path))

            # 2. Extract audio
            await publisher.publish_progress(media_id, user_id, "EXTRACTING_AUDIO", 30)
            await extract_audio(str(input_path), str(audio_path))

            # 3. Transcription
            await publisher.publish_progress(media_id, user_id, "TRANSCRIBING", 50)
            transcript = await transcribe_audio(str(audio_path))

            # 4. Summarize + Keywords
            await publisher.publish_progress(media_id, user_id, "SUMMARIZING", 80)
            result = await summarize_transcript(transcript)

            # 5. Persistir resultados
            await save_transcription_result(
                media_id, transcript, result["summary"], result["keywords"]
            )

            await publisher.publish_progress(media_id, user_id, "DONE", 100)
            logger.info(f"Pipeline completed for media {media_id}")

        except Exception as exc:
            logger.exception(f"Pipeline failed for media {media_id}")
            await update_media_status(media_id, "FAILED")
            await publisher.publish_progress(
                media_id, user_id, "FAILED", 0, message=str(exc)
            )
            raise PipelineError(str(exc)) from exc