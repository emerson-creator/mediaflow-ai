import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let app: INestApplication;
  const authService = {
    register: vi.fn(),
    login: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers with valid data', async () => {
    authService.register.mockResolvedValue({
      accessToken: 'test-token',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);

    expect(response.body.accessToken).toBe('test-token');
    expect(authService.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('rejects an invalid email during registration', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'invalid-email', password: 'password123' })
      .expect(400);

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('rejects a short password during registration', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'short' })
      .expect(400);

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('removes properties not declared in the registration DTO', async () => {
    authService.register.mockResolvedValue({
      accessToken: 'test-token',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        unexpected: 'value',
      })
      .expect(201);

    expect(authService.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('logs in with valid data', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'test-token',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);

    expect(response.body.accessToken).toBe('test-token');
    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('rejects an invalid email during login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'invalid-email', password: 'password123' })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });
});
