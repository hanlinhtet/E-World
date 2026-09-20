import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  ClientEvent,
  ServerEvent,
  ChatSendSchema,
  InputFrameSchema,
  Button,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@eworld/protocol';
import { SNAPSHOT_RATE, MOVE_SPEED, FIXED_DT } from '@eworld/shared';
import { AuthService } from '../auth/auth.service';
import { PlayerService } from '../player/player.service';
import { SessionRegistry } from './session.registry';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Realtime game gateway. Authenticates each socket from the access token,
 * registers a live session, applies validated input, and broadcasts world
 * snapshots at SNAPSHOT_RATE. The authoritative sim + AOI interest management
 * are fleshed out in Phase 2; this establishes the loop and contracts.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GameGateway.name);
  @WebSocketServer() private server!: Server<ClientToServerEvents, ServerToClientEvents>;
  private snapshotTimer?: NodeJS.Timeout;
  private persistTimer?: NodeJS.Timeout;

  constructor(
    private readonly auth: AuthService,
    private readonly players: PlayerService,
    private readonly sessions: SessionRegistry,
  ) {}

  afterInit(): void {
    // Broadcast snapshots and flush dirty sessions on independent cadences.
    this.snapshotTimer = setInterval(() => this.broadcastSnapshots(), 1000 / SNAPSHOT_RATE);
    this.persistTimer = setInterval(() => void this.flushDirty(), 5000);
  }

  async handleConnection(socket: GameSocket): Promise<void> {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization?.replace('Bearer ', '') ?? '');
      const payload = await this.auth.verifyAccess(token);
      const profile = await this.players.getProfile(payload.sub);

      this.sessions.add({
        uid: profile.uid,
        username: profile.username,
        socketId: socket.id,
        position: profile.position,
        look: profile.look,
        worldId: profile.worldId,
        lastAckSeq: 0,
        dirty: false,
      });

      socket.data.uid = profile.uid;
      await socket.join(`world:${profile.worldId}`);
      socket.emit(ServerEvent.Welcome, { uid: profile.uid, serverTime: Date.now() });
      this.logger.log(`Player connected: ${profile.username} (${profile.uid})`);
    } catch (err) {
      socket.emit(ServerEvent.Error, { code: 'AUTH_FAILED', message: 'Invalid token' });
      socket.disconnect(true);
    }
  }

  async handleDisconnect(socket: GameSocket): Promise<void> {
    const session = this.sessions.removeBySocket(socket.id);
    if (session) {
      await this.players
        .savePosition(session.uid, session.position, session.look, session.worldId)
        .catch((e) => this.logger.error(`Save on disconnect failed: ${e}`));
      this.logger.log(`Player disconnected: ${session.username}`);
    }
  }

  @SubscribeMessage(ClientEvent.Input)
  onInput(@ConnectedSocket() socket: GameSocket, @MessageBody() raw: unknown): void {
    const parsed = InputFrameSchema.safeParse(raw);
    if (!parsed.success) return;
    const session = this.sessions.getBySocket(socket.id);
    if (!session) return;

    // Minimal server-authoritative integration (full collision sim in Phase 2).
    const input = parsed.data;
    const speed = (input.buttons & Button.Sprint) !== 0 ? MOVE_SPEED.sprint : MOVE_SPEED.walk;
    const fwd = (input.buttons & Button.Forward ? 1 : 0) - (input.buttons & Button.Back ? 1 : 0);
    const strafe = (input.buttons & Button.Right ? 1 : 0) - (input.buttons & Button.Left ? 1 : 0);
    const yaw = input.look.yaw;
    session.position.x += (Math.sin(yaw) * fwd + Math.cos(yaw) * strafe) * speed * FIXED_DT;
    session.position.z += (Math.cos(yaw) * fwd - Math.sin(yaw) * strafe) * speed * FIXED_DT;
    session.look = input.look;
    session.lastAckSeq = input.seq;
    session.dirty = true;
  }

  @SubscribeMessage(ClientEvent.Chat)
  onChat(@ConnectedSocket() socket: GameSocket, @MessageBody() raw: unknown): void {
    const parsed = ChatSendSchema.safeParse(raw);
    if (!parsed.success) return;
    const session = this.sessions.getBySocket(socket.id);
    if (!session) return;
    this.server.to(`world:${session.worldId}`).emit(ServerEvent.Chat, {
      channel: parsed.data.channel,
      from: session.username,
      message: parsed.data.message,
      at: Date.now(),
    });
  }

  @SubscribeMessage(ClientEvent.Ping)
  onPing(@ConnectedSocket() socket: GameSocket, @MessageBody() clientTime: number): void {
    socket.emit(ServerEvent.Pong, clientTime, Date.now());
  }

  private broadcastSnapshots(): void {
    const worlds = new Set(this.sessions.all().map((s) => s.worldId));
    for (const worldId of worlds) {
      const sessions = this.sessions.inWorld(worldId);
      const players = sessions.map((s) => ({
        uid: s.uid,
        username: s.username,
        position: s.position,
        look: s.look,
      }));
      for (const s of sessions) {
        this.server.to(s.socketId).emit(ServerEvent.Snapshot, {
          tick: 0,
          ackSeq: s.lastAckSeq,
          serverTime: Date.now(),
          players,
        });
      }
    }
  }

  private async flushDirty(): Promise<void> {
    const dirty = this.sessions.takeDirty();
    await Promise.all(
      dirty.map((s) =>
        this.players
          .savePosition(s.uid, s.position, s.look, s.worldId)
          .catch((e) => this.logger.error(`Flush failed for ${s.uid}: ${e}`)),
      ),
    );
  }
}
