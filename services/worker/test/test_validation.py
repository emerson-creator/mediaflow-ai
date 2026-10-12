import sys
from unittest.mock import MagicMock, patch

import pytest

# Mock libmagic before importing the validation module.
sys.modules.setdefault("magic", MagicMock())

from app.errors import PermanentError
from app.media.validation import (
    ALLOWED_REAL_MIME_TYPES,
    InvalidFileTypeError,
    validate_file_type,
)


@pytest.mark.parametrize("mime_type", sorted(ALLOWED_REAL_MIME_TYPES))
def test_validate_file_type_accepts_allowed_mime_types(mime_type):
    with patch("app.media.validation.magic.from_file", return_value=mime_type) as sniff:
        result = validate_file_type("sample.media")

    assert result == mime_type
    sniff.assert_called_once_with("sample.media", mime=True)


@pytest.mark.parametrize(
    "mime_type",
    ["text/plain", "application/octet-stream", "application/x-msdownload", ""],
)
def test_validate_file_type_rejects_disallowed_mime_types(mime_type):
    with patch("app.media.validation.magic.from_file", return_value=mime_type):
        with pytest.raises(InvalidFileTypeError):
            validate_file_type("sample.media")


def test_invalid_file_type_is_a_permanent_error():
    assert issubclass(InvalidFileTypeError, PermanentError)


def test_validate_file_type_propagates_file_read_errors():
    with patch(
        "app.media.validation.magic.from_file",
        side_effect=OSError("file cannot be read"),
    ):
        with pytest.raises(OSError, match="file cannot be read"):
            validate_file_type("missing.media")

