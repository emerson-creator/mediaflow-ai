import asyncio
import logging

logger = logging.getLogger(__name__)


class FFmpegError(Exception):
    pass


def _format_ffmpeg_error(returncode: int, stderr: str) -> str:
    if "Invalid data found when processing input" in stderr:
        return "The uploaded file is corrupted or uses an unsupported media format."

    if "No such file or directory" in stderr:
        return "The uploaded media file could not be found."

    return f"FFmpeg could not process the uploaded file (exit code {returncode})."


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
        raise FFmpegError(_format_ffmpeg_error(process.returncode, error_msg))

    logger.info(f"Audio extracted: {output_path}")