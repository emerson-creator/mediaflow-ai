import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './user.entity';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let jwt: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    users = {
      findOneBy: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn(),
    };

    jwt = {
      sign: vi.fn().mockReturnValue('test-token'),
    };

    service = new AuthService(
      users as unknown as Repository<User>,
      jwt as unknown as JwtService,
    );
  });

  it('registers a user and returns a token', async () => {
    vi.mocked(users.findOneBy).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    vi.mocked(users.save).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    } as User);

    const result = await service.register({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(users.findOneBy).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(users.save).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
    });
    expect(result).toEqual({
      accessToken: 'test-token',
      user: { id: 'user-1', email: 'test@example.com' },
    });
  });

  it('rejects registration when the email already exists', async () => {
    vi.mocked(users.findOneBy).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    } as User);

    await expect(
      service.register({
        email: 'test@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });

  it('logs in a user with a valid password', async () => {
    vi.mocked(users.findOneBy).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    } as User);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'password123',
      'hashed-password',
    );
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'test@example.com',
    });
    expect(result.accessToken).toBe('test-token');
  });

  it('rejects login when the user does not exist', async () => {
    vi.mocked(users.findOneBy).mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects login when the password is incorrect', async () => {
    vi.mocked(users.findOneBy).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    } as User);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({
        email: 'test@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
