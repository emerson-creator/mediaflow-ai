import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Authenticated requests: track by userId (set by JwtAuthGuard upstream).
    // Unauthenticated requests (login/register): fall back to IP.
    return req.user?.userId ?? req.ip;
  }
}
