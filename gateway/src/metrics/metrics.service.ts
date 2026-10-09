import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Registry,
  Gauge,
  Histogram,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly httpRequestsTotal: Counter<string>;

  private readonly httpRequestDuration: Histogram<string>;

  private readonly activeRequests: Gauge<string>;

  constructor() {
    collectDefaultMetrics({
      register: this.registry,
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.activeRequests = new Gauge({
      name: 'http_requests_active',
      help: 'Number of HTTP requests currently being processed',
      registers: [this.registry],
    });
  }

  incrementHttpRequests(
    method: string,
    route: string,
    statusCode: number,
  ): void {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
  observeHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });

    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
      },
      duration,
    );
  }

  incrementActiveRequests(): void {
    this.activeRequests.inc();
  }

  decrementActiveRequests(): void {
    this.activeRequests.dec();
  }
}
