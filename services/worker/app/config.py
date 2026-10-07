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

    # AWS S3
    aws_region: str = Field(default="us-east-1", validation_alias="AWS_REGION")
    aws_access_key_id: str = Field(validation_alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(validation_alias="AWS_SECRET_ACCESS_KEY")
    s3_bucket: str = Field(default="mediaflow-storage", validation_alias="AWS_BUCKET_NAME")

    # OpenAI
    openai_api_key: str
    whisper_model: str = "whisper-1"
    summary_model: str = "gpt-4o-mini"

    # YouTube
    youtube_cookies_file: str | None = None

    @property
    def rabbitmq_url(self) -> str:
        return (
            f"amqp://{self.rabbitmq_user}:{self.rabbitmq_password}"
            f"@{self.rabbitmq_host}:{self.rabbitmq_port}/"
        )


settings = Settings()
