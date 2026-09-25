import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        ...config.getOrThrow<{
          host: string;
          port: number;
          username?: string;
          password?: string;
          database?: string;
        }>('database'),
        type: 'postgres',
        autoLoadEntities: true,
        synchronize: true, // dev only, same as the other services
      }),
    }),
    AuthModule,
    ProxyModule,
  ],
})
export class AppModule {}
