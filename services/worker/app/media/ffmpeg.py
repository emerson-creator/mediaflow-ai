import asyncio
import logging

from app.errors import PermanentError

logger = logging.getLogger(__name__)


class FFmpegError(PermanentError):
    """FFmpeg couldn't process the file. Almost always a corrupt/unsupported input."""


async def extract_audio(input_path: str, output_path: str) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-f", "wav",
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