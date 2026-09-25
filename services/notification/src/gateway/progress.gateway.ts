import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: string; // userId
  email: string;
}

@WebSocketGateway({
  cors: { origin: true }, //  tightened in Phase 6 via CORS_ORIGINS + Nginx
})
export class ProgressGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow('jwt.secret'),
      });

      // Store userId on the socket instance for later use (disconnect logging, etc.)
      client.data.userId = payload.sub;

      // Per-user room. Only this user's events will be sent here from now on.
      client.join(payload.sub);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch (err) {
      this.logger.warn(`Rejected connection ${client.id}: invalid token`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  private extractToken(client: Socket): string {
    // Client sends it as: io(url, { auth: { token: "..." } })
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) throw new UnauthorizedException('Missing token');
    return token;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastProgress(payload: Record<string, unknown>) {
    this.server
      .to(payload.userId as string)
      .emit('media.progress.updated', payload);
  }
}
