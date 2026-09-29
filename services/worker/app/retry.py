import asyncio
import logging
import random
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx
from openai import APIConnectionError, APIStatusError, APITimeoutError, RateLimitError

from app.errors import PermanentError, RetryableError
from app.errors import PipelineError as PipelineErrorTypes


logger = logging.getLogger(__name__)

T = TypeVar("T")

MAX_ATTEMPTS = 3
BASE_DELAY_SECONDS = 2.0


def _is_transient(exc: Exception) -> bool:
    """Decide whether an exception from an external call is worth retrying."""
    
    if isinstance(exc, (RateLimitError, APIConnectionError, APITimeoutError, httpx.TransportError)):
        return True
    if isinstance(exc, APIStatusError):
        # 5xx = their side broke; 4xx (except 429, handled above) = our request is wrong
        return exc.status_code >= 500
    return False


async def with_retry(
    operation: Callable[[], Awaitable[T]],
    *,
    name: str,
    log_ctx: dict | None = None,
) -> T:
    """Run `operation`, retrying transient failures with exponential backoff + jitter.

    Raises RetryableError if attempts are exhausted on a transient failure
    (so the message-level retry can take over), or PermanentError for failures
    that will never succeed.
    """
    ctx = log_ctx or {}
    last_exc: Exception | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return await operation()
        except PipelineErrorTypes:
            # Already classified by our own code (e.g. FFmpegError): don't touch it.
            raise
        except Exception as exc:
            last_exc = exc

            if not _is_transient(exc):
                logger.error(
                    "Non-transient failure, not retrying",
                    extra={**ctx, "operation": name, "error": str(exc)},
                )
                raise PermanentError(f"{name} failed: {exc}") from exc

            if attempt == MAX_ATTEMPTS:
                break

            # Exponential backoff with jitter: 2s, 4s (+ up to 1s random).
            # Jitter prevents many workers from retrying in lockstep and
            # hammering the API at the exact same moment.
            delay = BASE_DELAY_SECONDS * (2 ** (attempt - 1)) + random.uniform(0, 1)
            logger.warning(
                "Transient failure, retrying",
                extra={
                    **ctx,
                    "operation": name,
                    "attempt": attempt,
                    "max_attempts": MAX_ATTEMPTS,
                    "retry_in_seconds": round(delay, 1),
                    "error": str(exc),
                },
            )
            await asyncio.sleep(delay)

    raise RetryableError(f"{name} failed after {MAX_ATTEMPTS} attempts: {last_exc}") from last_exc


