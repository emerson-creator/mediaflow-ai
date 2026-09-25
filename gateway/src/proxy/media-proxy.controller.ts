import { All, Controller, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaProxyController {
  private readonly ingestionUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.ingestionUrl = config.getOrThrow('ingestionUrl');
  }

  // Catches GET/POST on /media and any subpath, e.g. /media/uploads, /media/:id
  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const userId = (req.user as { userId: string }).userId;
    const targetUrl = `${this.ingestionUrl}${req.originalUrl}`;

    try {
      const response = await firstValueFrom(
        this.http.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: {
            'Content-Type': 'application/json',
            // Internal-only header. Ingestion trusts this because it's
            // only reachable from the Gateway inside the Docker network,
            // never exposed directly to the internet.
            'x-user-id': userId,
          },
        }),
      );
      res.status(response.status).json(response.data);
    } catch (err: any) {
      const status = err.response?.status ?? 502;
      const data = err.response?.data ?? { message: 'Bad gateway' };
      res.status(status).json(data);
    }
  }
}
