import json
import logging

from openai import AsyncOpenAI

from app.config import settings
from app.errors import RetryableError

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.openai_api_key, max_retries=0)

SYSTEM_PROMPT = (
    "You summarize audio/video transcripts. "
    "ALWAYS return valid JSON with exactly this shape: "
    '{"summary": "2-4 sentence summary", "keywords": ["word1", "word2"]}'
)


class SummarizationError(RetryableError):
    """Model returned malformed output. A fresh call often fixes it."""


async def summarize_transcript(transcript: str) -> dict:
    if not transcript.strip():
        return {"summary": "", "keywords": []}

    logger.info("Generating summary and keywords")

    response = await _client.chat.completions.create(
        model=settings.summary_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript[:15000]},
        ],
        temperature=0.3,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError as e:
        raise SummarizationError(f"Model response was not valid JSON: {e}") from e