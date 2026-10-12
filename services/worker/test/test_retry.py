import asyncio
from unittest.mock import AsyncMock

import httpx
import pytest

from app.errors import PermanentError, PipelineError, RetryableError
from app import retry


@pytest.mark.asyncio
async def test_with_retry_returns_success_without_retrying():
    operation = AsyncMock(return_value="ok")

    result = await retry.with_retry(operation, name="test-operation")

    assert result == "ok"
    operation.assert_awaited_once()


@pytest.mark.asyncio
async def test_with_retry_retries_transient_errors(monkeypatch):
    operation = AsyncMock(
        side_effect=[httpx.ConnectError("temporary failure"), "ok"]
    )
    sleep = AsyncMock()
    monkeypatch.setattr(retry.asyncio, "sleep", sleep)
    monkeypatch.setattr(retry.random, "uniform", lambda _a, _b: 0)

    result = await retry.with_retry(operation, name="test-operation")

    assert result == "ok"
    assert operation.await_count == 2
    sleep.assert_awaited_once_with(retry.BASE_DELAY_SECONDS)


@pytest.mark.asyncio
async def test_with_retry_raises_permanent_error_without_retrying():
    operation = AsyncMock(side_effect=ValueError("invalid input"))

    with pytest.raises(PermanentError, match="test-operation failed"):
        await retry.with_retry(operation, name="test-operation")

    operation.assert_awaited_once()


@pytest.mark.asyncio
async def test_with_retry_raises_retryable_error_after_max_attempts(monkeypatch):
    operation = AsyncMock(side_effect=httpx.ConnectError("network unavailable"))
    sleep = AsyncMock()
    monkeypatch.setattr(retry.asyncio, "sleep", sleep)
    monkeypatch.setattr(retry.random, "uniform", lambda _a, _b: 0)

    with pytest.raises(RetryableError, match="failed after"):
        await retry.with_retry(operation, name="test-operation")

    assert operation.await_count == retry.MAX_ATTEMPTS
    assert sleep.await_count == retry.MAX_ATTEMPTS - 1


@pytest.mark.asyncio
async def test_with_retry_preserves_existing_pipeline_errors():
    operation = AsyncMock(side_effect=PermanentError("already classified"))

    with pytest.raises(PermanentError, match="already classified"):
        await retry.with_retry(operation, name="test-operation")

    operation.assert_awaited_once()


@pytest.mark.asyncio
async def test_with_retry_does_not_retry_unknown_pipeline_error():
    operation = AsyncMock(side_effect=PipelineError("pipeline failure"))

    with pytest.raises(PipelineError, match="pipeline failure"):
        await retry.with_retry(operation, name="test-operation")

    operation.assert_awaited_once()
