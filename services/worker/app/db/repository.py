import logging

from app.db.connection import get_pool

logger = logging.getLogger(__name__)


async def update_media_status(media_id: str, status: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE media SET status = $1, \"updatedAt\" = now() WHERE id = $2",
            status,
            media_id,
        )


async def save_transcription_result(
    media_id: str, transcript: str, summary: str, keywords: list[str]
) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO transcriptions (media_id, transcript, summary, keywords)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (media_id) DO UPDATE
                SET transcript = EXCLUDED.transcript,
                    summary = EXCLUDED.summary,
                    keywords = EXCLUDED.keywords
            """,
            media_id,
            transcript,
            summary,
            keywords,
        )
        await conn.execute(
            "UPDATE media SET status = 'DONE', \"updatedAt\" = now() WHERE id = $1",
            media_id,
        )