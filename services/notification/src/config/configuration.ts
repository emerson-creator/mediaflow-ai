export default () => ({
  port: parseInt(process.env.NOTIFICATION_PORT ?? '3002', 10),
  rabbitmq: {
    url: `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${
      process.env.RABBITMQ_HOST ?? 'localhost'
    }:${process.env.RABBITMQ_PORT ?? '5672'}`,
    exchange: 'mediaflow.events',
    // Own queue, different from the worker's queue.
    // Multiple services can bind their own queue to the same exchange.
    progressQueue: 'notification.progress',
    routingKey: 'media.progress.*',
  },
  // Comma-separated list, parsed into an array. Used later by Nginx/Frontend.
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
});
