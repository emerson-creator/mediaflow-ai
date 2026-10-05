export default () => ({
  port: parseInt(process.env.INGESTION_PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  rabbitmq: {
    url: `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${
      process.env.RABBITMQ_HOST ?? 'localhost'
    }:${process.env.RABBITMQ_PORT ?? '5672'}`,
    exchange: 'mediaflow.events',
  },
  s3: {
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION ?? 'us-east-1',
    bucket: process.env.AWS_BUCKET_NAME ?? 'media-uploads',
    presignExpiresSeconds: 900, // 15 minutes
  },
});
