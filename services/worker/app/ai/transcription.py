import logging
import os

from openai import AsyncOpenAI

from app.config import settings
from app.errors import PermanentError

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.openai_api_key, max_retries=0)

MAX_WHISPER_BYTES = 25 * 1024 * 1024


class TranscriptionError(PermanentError):
    pass


async def transcribe_audio(audio_path: str) -> dict:
    """Returns {"text": full transcript, "segments": [{start, end, text}, ...]}."""
    size = os.path.getsize(audio_path)
    if size > MAX_WHISPER_BYTES:
        raise TranscriptionError(
            f"Audio is {size / 1_048_576:.1f}MB, over Whisper's 25MB limit."
        )

    logger.info("Transcribing audio", extra={"size_mb": round(size / 1_048_576, 1)})

    with open(audio_path, "rb") as f:
        response = await _client.audio.transcriptions.create(
            model=settings.whisper_model,
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    # verbose_json gives segments with start/end/text plus extra fields
    # (avg_logprob, no_speech_prob, etc.) we don't need — keep only what
    # the frontend actually uses, to keep the stored payload small.
    segments = [
        {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
        for s in response.segments
    ]

    return {"text": response.text, "segments": segments}