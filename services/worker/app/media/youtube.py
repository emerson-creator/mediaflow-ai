import asyncio
import json
import logging
from pathlib import Path

from app.errors import PermanentError, RetryableError

logger = logging.getLogger(__name__)

MAX_DURATION_SECONDS = 2 * 60 * 60  # same limit as regular uploads


class YoutubeMetadataError(PermanentError):
    """URL is invalid, video is private/deleted/age-restricted, etc."""


class YoutubeDownloadError(RetryableError):
    """Network hiccup or transient YouTube-side issue during download."""


class YoutubeDurationExceededError(PermanentError):
    pass


async def fetch_metadata(url: str) -> dict:
    """Fetch video metadata WITHOUT downloading, using yt-dlp --dump-json.
    Fast (1-2s) regardless of video length, since it doesn't touch the media itself.
    """
    cmd = ["yt-dlp", "--dump-json", "--no-playlist", url]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode(errors="replace")
        logger.error("yt-dlp metadata fetch failed", extra={"stderr_tail": error_msg[-500:]})
        # Almost always permanent: private video, deleted, invalid URL, age-gated.
        raise YoutubeMetadataError(f"Could not fetch video info: {error_msg[-300:]}")

    try:
        return json.loads(stdout)
    except json.JSONDecodeError as e:
        raise YoutubeMetadataError(f"yt-dlp returned invalid JSON: {e}") from e


def enforce_youtube_duration_limit(metadata: dict) -> float:
    duration = metadata.get("duration")
    if duration is None:
        # Some live streams / unusual videos don't report duration up front.
        # Reject rather than risk an unbounded download.
        raise YoutubeMetadataError("Video duration is unknown (possibly a live stream)")

    if duration > MAX_DURATION_SECONDS:
        logger.error(
            "YouTube video exceeds duration limit",
            extra={"duration_seconds": duration, "limit_seconds": MAX_DURATION_SECONDS},
        )
        raise YoutubeDurationExceededError(
            f"Video is {duration / 60:.1f}min, exceeds the {MAX_DURATION_SECONDS / 60:.0f}min limit"
        )
    return duration


async def download_audio(url: str, output_dir: str) -> str:
    """Downloads best-quality audio only (no video track) as m4a.
    Returns the path to the downloaded file.
    """
    output_template = str(Path(output_dir) / "audio.%(ext)s")

    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-f", "bestaudio[ext=m4a]/bestaudio",
        "-o", output_template,
        url,
    ]

    logger.info("Downloading audio via yt-dlp", extra={"url": url})

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode(errors="replace")
        logger.error("yt-dlp download failed", extra={"stderr_tail": error_msg[-500:]})
        # Treat as retryable: could be a transient network/YouTube-side issue.
        raise YoutubeDownloadError(f"Download failed: {error_msg[-300:]}")

    # yt-dlp names the output based on the actual container it picked
    # (m4a is requested, but it can fall back to webm/opus etc).
    downloaded_files = list(Path(output_dir).glob("audio.*"))
    if not downloaded_files:
        raise YoutubeDownloadError("yt-dlp reported success but no output file was found")

    return str(downloaded_files[0])