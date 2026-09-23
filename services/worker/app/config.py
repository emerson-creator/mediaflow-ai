from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

    # Postgres
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str
    postgres_password: str
    postgres_db: str

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

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()