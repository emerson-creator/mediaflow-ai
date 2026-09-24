import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true }, // tightened once CORS_ORIGINS is wired up (Phase 4/5)
})
export class ProgressGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcasts to ALL connected clients.
   * TODO (Phase 4): once JWT auth is on the socket, join a per-user room
   * (`client.join(userId)`) and emit only to that room instead of broadcasting.
   */
  broadcastProgress(payload: Record<string, unknown>) {
    this.server.emit('media.progress.updated', payload);
  }
}
