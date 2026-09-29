import logging
import os

from openai import AsyncOpenAI

from app.config import settings
from app.errors import PermanentError

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.openai_api_key, max_retries=0)
# max_retries=0: the SDK has its own built-in retry, but we want ONE place
# that owns retry policy (retry.py), so we disable the SDK's and control it ourselves.

MAX_WHISPER_BYTES = 25 * 1024 * 1024


class TranscriptionError(PermanentError):
    pass


async def transcribe_audio(audio_path: str) -> str:
    size = os.path.getsize(audio_path)
    if size > MAX_WHISPER_BYTES:
        raise TranscriptionError(
            f"Audio is {size / 1_048_576:.1f}MB, over Whisper's 25MB limit."
        )

    logger.info("Transcribing audio", extra={"size_mb": round(size / 1_048_576, 1)})

    with open(audio_path, "rb") as f:
        transcript = await _client.audio.transcriptions.create(
            model=settings.whisper_model,
            file=f,
            response_format="text",
        )

    return transcript