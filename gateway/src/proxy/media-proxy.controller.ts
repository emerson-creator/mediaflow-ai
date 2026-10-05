import {
  All,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Throttle } from '@nestjs/throttler';
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

  // 1. Limite más permisivo para lecturas de la librería y navegación en el frontend
  // (120 peticiones por minuto por usuario)
  @Get()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  proxyRoot(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res);
  }

  // 2. Límite estricto para crear presigned URLs (10 por minuto)
  @Post('uploads')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  proxyUpload(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res);
  }

  // 3. Límite estricto para procesar desde YouTube (10 por minuto)
  @Post('from-youtube')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createYoutubeUpload(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res);
  }

  // 4. Captura endpoints dinámicos como GET /media/:id o subrutas de lectura
  // Le asignamos un límite holgado para que la navegación no bloquee al cliente
  @Get(':id')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  proxyMediaById(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res);
  }

  // 5. Fallback para cualquier otra subruta
  @All('{*path}')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
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
