import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors();

  const metricsService = app.get(MetricsService);

  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  const port = app.get(ConfigService).get<number>('port')!;

  await app.listen(port);
}

bootstrap();
