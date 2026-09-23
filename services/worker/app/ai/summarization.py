import logging

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = (
    "You are an assistant that summarizes audio/video transcriptions. "
    "Always return valid JSON in this exact shape: "
    '{"summary": "summary in 2-4 sentences", "keywords": ["word1", "word2"]}'
)


class SummarizationError(Exception):
    pass


async def summarize_transcript(transcript: str) -> dict:
    if not transcript.strip():
        return {"summary": "", "keywords": []}

    logger.info("Generating summary and keywords")

    response = await _client.chat.completions.create(
        model=settings.summary_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript[:15000]},  # context margin
        ],
        temperature=0.3,
    )

    import json
    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError as e:
        raise SummarizationError(f"Response was not valid JSON: {e}")