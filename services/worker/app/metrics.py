from prometheus_client import Counter, Gauge, Histogram


jobs_total = Counter(
    "worker_jobs_total",
    "Total number of media processing jobs",
    ["source_type", "result"],
)

job_duration_seconds = Histogram(
    "worker_job_duration_seconds",
    "Media processing job duration in seconds",
    ["source_type"],
)

jobs_active = Gauge(
    "worker_jobs_active",
    "Number of media processing jobs currently being processed",
)

retries_total = Counter(
    "worker_retries_total",
    "Total number of scheduled retries",
)

dlq_total = Counter(
    "worker_dlq_total",
    "Total number of jobs sent to the dead-letter queue",
)