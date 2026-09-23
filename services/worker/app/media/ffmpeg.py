import asyncio
import logging

logger = logging.getLogger(__name__)


class FFmpegError(Exception):
    pass


async def extract_audio(input_path: str, output_path: str) -> None:
    """
    Extract audio to mono 16kHz WAV format (optimal for Whisper).
    Use asyncio.subprocess to avoid blocking the event loop.
    """
    cmd = [
        "ffmpeg",
        "-y",  # overwrite if it exists
        "-i", input_path,
        "-vn",  # no video
        "-ac", "1",  # mono
        "-ar", "16000",  # 16kHz, as expected by Whisper
        "-f", "wav",
        output_path,
    ]

    logger.info(f"Executing: {' '.join(cmd)}")

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode(errors="replace")
        logger.error(f"FFmpeg failed: {error_msg}")
        raise FFmpegError(f"FFmpeg exit code {process.returncode}: {error_msg[-500:]}")

    logger.info(f"Audio extracted: {output_path}")