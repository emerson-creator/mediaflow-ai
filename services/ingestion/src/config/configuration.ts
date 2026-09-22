export default () => ({
  port: parseInt(process.env.INGESTION_PORT ?? '3001', 10),
  database: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
  rabbitmq: {
    url: `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${
      process.env.RABBITMQ_HOST ?? 'localhost'
    }:${process.env.RABBITMQ_PORT ?? '5672'}`,
    exchange: 'mediaflow.events',
  },
  s3: {
    endpoint: `http://${process.env.MINIO_HOST ?? 'localhost'}:${
      process.env.MINIO_API_PORT ?? '9000'
    }`,
    // URL que verá el navegador (importante en Docker, ver nota abajo)
    publicEndpoint: process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000',
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
    bucket: process.env.MINIO_BUCKET ?? 'media-uploads',
    region: 'us-east-1',
    presignExpiresSeconds: 900,
  },
});
