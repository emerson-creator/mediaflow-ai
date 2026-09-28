import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        // Pretty-print in dev, raw JSON in prod (JSON is what a log
        // aggregator like Loki/Grafana actually wants to ingest).
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
        // Every HTTP request gets a correlation id from this header if
        // present, or generates one. This alone doesn't give us mediaId
        // correlation yet — that's added explicitly where mediaId exists,
        // see MediaService below.
        genReqId: (req) =>
          req.headers['x-correlation-id'] ?? crypto.randomUUID(),
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
