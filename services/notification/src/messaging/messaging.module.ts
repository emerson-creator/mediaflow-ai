import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { RabbitMQConsumerService } from './rabbitmq-consumer.service';

@Module({
  imports: [GatewayModule],
  providers: [RabbitMQConsumerService],
})
export class MessagingModule {}
