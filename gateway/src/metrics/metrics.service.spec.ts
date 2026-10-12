import { afterEach, describe, expect, it } from 'vitest';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  afterEach(() => {
    service = undefined as unknown as MetricsService;
  });

  it('registers HTTP request metrics', async () => {
    service = new MetricsService();

    const metrics = await service.getMetrics();

    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('http_requests_active');
  });

  it('increments the HTTP request counter with its labels', async () => {
    service = new MetricsService();

    service.incrementHttpRequests('GET', '/media', 200);

    const metrics = await service.getMetrics();

    expect(metrics).toContain(
      'http_requests_total{method="GET",route="/media",status_code="200"} 1',
    );
  });

  it('records HTTP request duration', async () => {
    service = new MetricsService();

    service.observeHttpRequest('POST', '/auth/login', 401, 0.25);

    const metrics = await service.getMetrics();

    expect(metrics).toContain(
      'http_requests_total{method="POST",route="/auth/login",status_code="401"} 1',
    );
    expect(metrics).toContain('http_request_duration_seconds_count');
    expect(metrics).toContain(
      'http_request_duration_seconds_count{method="POST",route="/auth/login",status_code="401"} 1',
    );
    expect(metrics).toContain(
      'http_request_duration_seconds_sum{method="POST",route="/auth/login",status_code="401"} 0.25',
    );
  });

  it('tracks active requests', async () => {
    service = new MetricsService();

    service.incrementActiveRequests();
    service.incrementActiveRequests();
    service.decrementActiveRequests();

    const metrics = await service.getMetrics();

    expect(metrics).toContain('http_requests_active 1');
  });

  it('exposes the Prometheus content type', () => {
    service = new MetricsService();

    expect(service.getContentType()).toContain('text/plain');
  });
});
