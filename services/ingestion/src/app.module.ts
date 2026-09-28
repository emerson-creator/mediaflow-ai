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
      envFilePath: ['../../.env'], // el .env vive en la raíz del monorepo
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const database = config.getOrThrow<{
          host: string;
          port: number;
          username?: string;
          password?: string;
          database?: string;
        }>('database');

        return {
          type: 'postgres',
          host: database.host,
          port: database.port,
          username: database.username,
          password: database.password,
          database: database.database,
          autoLoadEntities: true,
          // ⚠️ SOLO desarrollo. En producción usaremos migraciones.
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
