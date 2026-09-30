import logging

import magic

from app.errors import PermanentError

logger = logging.getLogger(__name__)

# Real (sniffed) MIME types we accept. Note this list is intentionally
# narrower than the upload DTO's list in Ingestion — some formats are
# hard to distinguish reliably by magic bytes alone (e.g. some audio
# containers), so we accept the common, unambiguous ones here.
ALLOWED_REAL_MIME_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-matroska",  # some .mp4 containers get sniffed as this
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
    "audio/mp4",
    "audio/x-m4a",
}


class InvalidFileTypeError(PermanentError):
    pass


def validate_file_type(file_path: str) -> str:
    """Sniff the file's real MIME type from its content, ignoring any
    extension or client-declared Content-Type. Returns the detected type
    if allowed, raises InvalidFileTypeError otherwise.
    """
    detected_mime = magic.from_file(file_path, mime=True)

    if detected_mime not in ALLOWED_REAL_MIME_TYPES:
        logger.error(
            "Rejected file with disallowed real content type",
            extra={"detected_mime": detected_mime},
        )
        raise InvalidFileTypeError(
            f"File content is actually '{detected_mime}', which is not an allowed media type"
        )

    logger.info("File type validated", extra={"detected_mime": detected_mime})
    return detected_mime