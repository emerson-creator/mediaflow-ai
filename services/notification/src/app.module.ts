import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { GatewayModule } from './gateway/gateway.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env'],
    }),
    GatewayModule,
    MessagingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
