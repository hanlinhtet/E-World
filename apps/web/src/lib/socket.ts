import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@eworld/protocol';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

/** Connect (or reuse) the authenticated game socket. */
export function connectSocket(accessToken: string): GameSocket {
  if (socket?.connected) return socket;
  socket = io(WS_URL, {
    transports: ['websocket'],
    auth: { token: accessToken },
    autoConnect: true,
  });
  return socket;
}

export function getSocket(): GameSocket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
