import logging
import os

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.openai_api_key)

MAX_WHISPER_BYTES = 25 * 1024 * 1024  # hard API limit


class TranscriptionError(Exception):
    pass


async def transcribe_audio(audio_path: str) -> str:
    size = os.path.getsize(audio_path)
    if size > MAX_WHISPER_BYTES:
        raise TranscriptionError(
            f"Audio of {size / 1_048_576:.1f}MB exceeds Whisper's 25MB limit. "
            "Chunking is not implemented yet (we can revisit it if needed)."
        )

    logger.info(f"Transcribing audio ({size / 1_048_576:.1f}MB)")

    with open(audio_path, "rb") as f:
        transcript = await _client.audio.transcriptions.create(
            model=settings.whisper_model,
            file=f,
            response_format="text",
        )

    # With response_format="text", the SDK returns a plain string directly
    return transcript