import asyncio
import json
import logging

from app.errors import PermanentError

logger = logging.getLogger(__name__)

MAX_DURATION_SECONDS = 2 * 60 * 60  # 2 hours; adjust to your real use case


class FFmpegError(PermanentError):
    """FFmpeg couldn't process the file. Almost always a corrupt/unsupported input."""


class DurationLimitExceededError(PermanentError):
    pass


async def probe_duration_seconds(input_path: str) -> float:
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        input_path,
    ]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise FFmpegError(f"ffprobe failed: {stderr.decode(errors='replace')[-300:]}")

    try:
        data = json.loads(stdout)
        return float(data["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        raise FFmpegError(f"Could not parse duration from ffprobe output: {e}") from e


async def enforce_duration_limit(input_path: str) -> float:
    duration = await probe_duration_seconds(input_path)
    if duration > MAX_DURATION_SECONDS:
        logger.error(
            "File exceeds duration limit",
            extra={"duration_seconds": duration, "limit_seconds": MAX_DURATION_SECONDS},
        )
        raise DurationLimitExceededError(
            f"Duration {duration / 60:.1f}min exceeds the {MAX_DURATION_SECONDS / 60:.0f}min limit"
        )
    return duration


async def extract_audio(input_path: str, output_path: str) -> None:
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vn", "-ac", "1", "-ar", "16000", "-f", "wav",
        output_path,
    ]
    logger.info("Running ffmpeg", extra={"cmd": " ".join(cmd)})

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode(errors="replace")
        logger.error("FFmpeg failed", extra={"stderr_tail": error_msg[-500:]})
        raise FFmpegError(f"FFmpeg exit code {process.returncode}: {error_msg[-500:]}")

    logger.info("Audio extracted", extra={"output": output_path})