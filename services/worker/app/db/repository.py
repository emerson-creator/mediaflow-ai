import json
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
    media_id: str, transcript: str, summary: str, keywords: list[str], segments: list[dict]
) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO transcriptions (media_id, transcript, summary, keywords, segments)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (media_id) DO UPDATE
                    SET transcript = EXCLUDED.transcript,
                        summary = EXCLUDED.summary,
                        keywords = EXCLUDED.keywords,
                        segments = EXCLUDED.segments
                """,
                media_id, transcript, summary, keywords, json.dumps(segments),
            )
            await conn.execute(
                "UPDATE media SET status = 'DONE', \"updatedAt\" = now() WHERE id = $1",
                media_id,
            )

async def get_media_status(media_id: str) -> str | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval(
            "SELECT status FROM media WHERE id = $1", media_id
        )

async def update_media_youtube_metadata(
    media_id: str, title: str, thumbnail_url: str, object_key: str, mime_type: str, size_bytes: int
) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE media
            SET title = $1, "thumbnailUrl" = $2, "objectKey" = $3,
                "mimeType" = $4, "sizeBytes" = $5, status = 'PROCESSING', "updatedAt" = now()
            WHERE id = $6
            """,
            title, thumbnail_url, object_key, mime_type, size_bytes, media_id,
        )