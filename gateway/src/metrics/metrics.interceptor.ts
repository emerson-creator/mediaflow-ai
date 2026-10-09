import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method;
    const route = request.route?.path ?? request.path;

    const start = process.hrtime.bigint();

    this.metricsService.incrementActiveRequests();

    return next.handle().pipe(
      finalize(() => {
        const duration = Number(process.hrtime.bigint() - start) / 1e9;

        this.metricsService.decrementActiveRequests();

        this.metricsService.observeHttpRequest(
          method,
          route,
          response.statusCode,
          duration,
        );
      }),
    );
  }
}
