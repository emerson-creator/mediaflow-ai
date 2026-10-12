import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { MediaProxyController } from './media-proxy.controller';

describe('MediaProxyController', () => {
  let controller: MediaProxyController;
  let http: { request: ReturnType<typeof vi.fn> };
  let config: { getOrThrow: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    http = { request: vi.fn() };
    config = {
      getOrThrow: vi.fn().mockReturnValue('http://ingestion:3001'),
    };

    controller = new MediaProxyController(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
  });

  function createRequest(overrides: Record<string, unknown> = {}) {
    return {
      user: { userId: 'user-123' },
      method: 'GET',
      originalUrl: '/media',
      body: undefined,
      ...overrides,
    } as any;
  }

  function createResponse() {
    const response: any = {
      status: vi.fn(),
      json: vi.fn(),
    };
    response.status.mockReturnValue(response);
    return response;
  }

  it('forwards the request to ingestion with the authenticated user ID', async () => {
    http.request.mockReturnValue(
      of({ status: 200, data: [{ id: 'media-1' }] }),
    );

    const req = createRequest();
    const res = createResponse();

    await controller.proxy(req, res);

    expect(http.request).toHaveBeenCalledWith({
      method: 'GET',
      url: 'http://ingestion:3001/media',
      data: undefined,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user-123',
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 'media-1' }]);
  });

  it('forwards the request body and original URL', async () => {
    http.request.mockReturnValue(
      of({ status: 201, data: { id: 'media-2' } }),
    );

    const req = createRequest({
      method: 'POST',
      originalUrl: '/media/uploads?type=video',
      body: { filename: 'clip.mp4' },
    });
    const res = createResponse();

    await controller.proxy(req, res);

    expect(http.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://ingestion:3001/media/uploads?type=video',
        data: { filename: 'clip.mp4' },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('forwards ingestion error responses', async () => {
    http.request.mockReturnValue(
      throwError(() => ({
        response: {
          status: 404,
          data: { message: 'Media not found' },
        },
      })),
    );

    const res = createResponse();

    await controller.proxy(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Media not found',
    });
  });

  it('returns 502 when ingestion is unavailable', async () => {
    http.request.mockReturnValue(
      throwError(() => new Error('Connection refused')),
    );

    const res = createResponse();

    await controller.proxy(createRequest(), res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Bad gateway',
    });
  });
});
