from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../../.env",  # Apunta al .env en la raíz del monorepo
        extra="ignore",
    )

    # Postgres (Neon)
    postgres_dsn: str = Field(validation_alias="DATABASE_URL")
    postgres_ssl: bool = Field(default=True, validation_alias="POSTGRES_SSL")
    # RabbitMQ
    rabbitmq_user: str
    rabbitmq_password: str
    rabbitmq_host: str = "rabbitmq"
    rabbitmq_port: int = 5672
    exchange_name: str = "mediaflow.events"
    upload_queue: str = "worker.media.uploaded"

    # MinIO
    minio_host: str = "minio"
    minio_api_port: int = 9000
    minio_root_user: str
    minio_root_password: str
    minio_bucket: str = "media-uploads"

    # OpenAI
    openai_api_key: str
    whisper_model: str = "whisper-1"
    summary_model: str = "gpt-4o-mini"

    @property
    def rabbitmq_url(self) -> str:
        return (
            f"amqp://{self.rabbitmq_user}:{self.rabbitmq_password}"
            f"@{self.rabbitmq_host}:{self.rabbitmq_port}/"
        )

    @property
    def minio_endpoint(self) -> str:
        return f"http://{self.minio_host}:{self.minio_api_port}"


settings = Settings()