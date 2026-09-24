import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import { ProgressGateway } from '../gateway/progress.gateway';

@Injectable()
export class RabbitMQConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumerService.name);
  private connection: amqp.AmqpConnectionManager;
  private channel: ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: ProgressGateway,
  ) {}

  async onModuleInit() {
    const { url, exchange, progressQueue, routingKey } =
      this.config.getOrThrow('rabbitmq');

    this.connection = amqp.connect([url]);
    this.connection.on('connect', () =>
      this.logger.log('Connected to RabbitMQ'),
    );
    this.connection.on('disconnect', ({ err }) =>
      this.logger.error(`Disconnected from RabbitMQ: ${err?.message}`),
    );

    this.channel = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        await channel.assertExchange(exchange, 'topic', { durable: true });
        await channel.assertQueue(progressQueue, { durable: true });
        await channel.bindQueue(progressQueue, exchange, routingKey);
        await channel.prefetch(10); // consumer can handle several in flight
        await channel.consume(progressQueue, (msg) =>
          this.handleMessage(msg, channel),
        );
      },
    });

    await this.channel.waitForConnect();
  }

  private handleMessage(msg: ConsumeMessage | null, channel: Channel) {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      this.logger.log(
        `Progress event: ${payload.mediaId} -> ${payload.stage} (${payload.progress}%)`,
      );
      this.gateway.broadcastProgress(payload);
      channel.ack(msg);
    } catch (err) {
      this.logger.error(`Failed to process message: ${err}`);
      // Don't requeue a malformed message; it would loop forever.
      channel.nack(msg, false, false);
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
