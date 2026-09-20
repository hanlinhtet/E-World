import { Injectable } from '@nestjs/common';
import type { Vec3, Look } from '@eworld/shared';

/** In-memory session state for a connected player (the hot, per-tick state). */
export interface PlayerSession {
  uid: string;
  username: string;
  socketId: string;
  position: Vec3;
  look: Look;
  worldId: string;
  /** last input sequence number the server has applied (for reconciliation) */
  lastAckSeq: number;
  /** set when the session has unsaved changes (write-behind flush) */
  dirty: boolean;
}

/**
 * Authoritative in-memory registry of connected players. This is the live game
 * state; PostgreSQL is written-behind from it. Designed to be swappable for a
 * Redis-backed implementation when scaling to multiple nodes.
 */
@Injectable()
export class SessionRegistry {
  private readonly byUid = new Map<string, PlayerSession>();
  private readonly bySocket = new Map<string, string>();

  add(session: PlayerSession): void {
    this.byUid.set(session.uid, session);
    this.bySocket.set(session.socketId, session.uid);
  }

  removeBySocket(socketId: string): PlayerSession | undefined {
    const uid = this.bySocket.get(socketId);
    if (!uid) return undefined;
    const session = this.byUid.get(uid);
    this.bySocket.delete(socketId);
    this.byUid.delete(uid);
    return session;
  }

  get(uid: string): PlayerSession | undefined {
    return this.byUid.get(uid);
  }

  getBySocket(socketId: string): PlayerSession | undefined {
    const uid = this.bySocket.get(socketId);
    return uid ? this.byUid.get(uid) : undefined;
  }

  /** All sessions in a world (Phase 2 will narrow this to an AOI cell). */
  inWorld(worldId: string): PlayerSession[] {
    return [...this.byUid.values()].filter((s) => s.worldId === worldId);
  }

  all(): PlayerSession[] {
    return [...this.byUid.values()];
  }

  takeDirty(): PlayerSession[] {
    const dirty = [...this.byUid.values()].filter((s) => s.dirty);
    dirty.forEach((s) => (s.dirty = false));
    return dirty;
  }
}
