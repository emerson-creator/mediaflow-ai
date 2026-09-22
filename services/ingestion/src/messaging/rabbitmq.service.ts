import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { Channel } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channel: ChannelWrapper;
  private exchange: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const { url, exchange } = this.config.getOrThrow('rabbitmq');
    this.exchange = exchange;

    this.connection = amqp.connect([url]);
    this.connection.on('connect', () =>
      this.logger.log('Conectado a RabbitMQ'),
    );
    this.connection.on('disconnect', ({ err }) =>
      this.logger.error(`Desconectado de RabbitMQ: ${err?.message}`),
    );

    this.channel = this.connection.createChannel({
      json: true,
      // Se ejecuta en cada (re)conexión: declara el exchange idempotentemente
      setup: (channel: Channel) =>
        channel.assertExchange(this.exchange, 'topic', { durable: true }),
    });

    await this.channel.waitForConnect();
  }

  async publish(routingKey: string, payload: Record<string, unknown>) {
    await this.channel.publish(this.exchange, routingKey, payload, {
      persistent: true, // el mensaje sobrevive a un reinicio del broker
      contentType: 'application/json',
    });
    this.logger.log(`Evento publicado: ${routingKey}`);
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
