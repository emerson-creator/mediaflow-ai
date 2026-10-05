import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { MediaModule } from './media/media.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [
    LoggingModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env'], //  .env
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const dbUrl = config.getOrThrow<string>('database.url');

        return {
          type: 'postgres',
          url: dbUrl,
          // tl;dr: Neon requires SSL, but with rejectUnauthorized=false. See
          ssl: {
            rejectUnauthorized: false,
          },
          autoLoadEntities: true,
          // change later to false in production, and use migrations instead of synchronize
          synchronize: true,
        };
      },
    }),
    MessagingModule,
    MediaModule,
    HealthModule,
  ],
})
export class AppModule {}
