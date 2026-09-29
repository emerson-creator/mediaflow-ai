class PipelineError(Exception):
    """Base class for all pipeline failures."""


class RetryableError(PipelineError):
    """Transient failure: the same message might succeed if tried again later.

    Examples: OpenAI 429/5xx, network timeouts, MinIO temporarily down.
    """


class PermanentError(PipelineError):
    """Failure that will never succeed no matter how many times we retry.

    Examples: corrupt file, unsupported codec, audio over the size limit,
    invalid event payload. Retrying these just burns time and money.
    """