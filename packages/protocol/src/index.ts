/**
 * Network protocol — the single source of truth for the realtime wire format.
 *
 * Every socket message has a Zod schema here. The server validates inbound
 * messages against these schemas (never trust the client); the client gets
 * fully-typed payloads for free. Event *names* are centralized in `ClientEvent`
 * / `ServerEvent` so renames are a one-line change on both sides.
 */
import { z } from 'zod';

// ── Primitives ────────────────────────────────────────────────
export const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const LookSchema = z.object({
  yaw: z.number(),
  pitch: z.number(),
});

// ── Client → Server ───────────────────────────────────────────

/** A single input frame from the client, stamped with a sequence number for reconciliation. */
export const InputFrameSchema = z.object({
  seq: z.number().int().nonnegative(),
  dt: z.number().positive().max(0.1),
  /** bit flags: forward/back/left/right/jump/sprint/crouch — packed client-side */
  buttons: z.number().int().nonnegative(),
  look: LookSchema,
});
export type InputFrame = z.infer<typeof InputFrameSchema>;

export const ChatSendSchema = z.object({
  channel: z.enum(['local', 'world', 'party', 'guild']),
  message: z.string().min(1).max(500),
});
export type ChatSend = z.infer<typeof ChatSendSchema>;

export const InteractSchema = z.object({
  targetEntityId: z.string(),
  action: z.enum(['mine', 'talk', 'attack', 'loot', 'use']),
});
export type Interact = z.infer<typeof InteractSchema>;

// ── Server → Client ───────────────────────────────────────────

export const PlayerSnapshotSchema = z.object({
  uid: z.string(),
  username: z.string(),
  position: Vec3Schema,
  look: LookSchema,
});

/** Delta snapshot of nearby entities, sent at SNAPSHOT_RATE. */
export const WorldSnapshotSchema = z.object({
  tick: z.number().int().nonnegative(),
  /** echoes the last input seq the server has applied for this client */
  ackSeq: z.number().int().nonnegative(),
  serverTime: z.number(),
  players: z.array(PlayerSnapshotSchema),
});
export type WorldSnapshot = z.infer<typeof WorldSnapshotSchema>;

export const ChatMessageSchema = z.object({
  channel: z.enum(['local', 'world', 'party', 'guild', 'system']),
  from: z.string(),
  message: z.string(),
  at: z.number(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const WeatherUpdateSchema = z.object({
  kind: z.string(),
  intensity: z.number().min(0).max(1),
  windDirection: z.number(),
  windSpeed: z.number(),
});
export type WeatherUpdate = z.infer<typeof WeatherUpdateSchema>;

// ── Event name registries ─────────────────────────────────────

export const ClientEvent = {
  Input: 'c:input',
  Chat: 'c:chat',
  Interact: 'c:interact',
  Ping: 'c:ping',
} as const;
export type ClientEvent = (typeof ClientEvent)[keyof typeof ClientEvent];

export const ServerEvent = {
  Welcome: 's:welcome',
  Snapshot: 's:snapshot',
  Chat: 's:chat',
  Weather: 's:weather',
  EntityDespawn: 's:entity_despawn',
  Pong: 's:pong',
  Error: 's:error',
} as const;
export type ServerEvent = (typeof ServerEvent)[keyof typeof ServerEvent];

/** Strongly-typed maps for socket.io generics on both ends. */
export interface ClientToServerEvents {
  [ClientEvent.Input]: (payload: InputFrame) => void;
  [ClientEvent.Chat]: (payload: ChatSend) => void;
  [ClientEvent.Interact]: (payload: Interact) => void;
  [ClientEvent.Ping]: (clientTime: number) => void;
}

export interface ServerToClientEvents {
  [ServerEvent.Welcome]: (payload: { uid: string; serverTime: number }) => void;
  [ServerEvent.Snapshot]: (payload: WorldSnapshot) => void;
  [ServerEvent.Chat]: (payload: ChatMessage) => void;
  [ServerEvent.Weather]: (payload: WeatherUpdate) => void;
  [ServerEvent.EntityDespawn]: (payload: { id: string }) => void;
  [ServerEvent.Pong]: (clientTime: number, serverTime: number) => void;
  [ServerEvent.Error]: (payload: { code: string; message: string }) => void;
}

/** Button bit flags for InputFrame.buttons. */
export const Button = {
  Forward: 1 << 0,
  Back: 1 << 1,
  Left: 1 << 2,
  Right: 1 << 3,
  Jump: 1 << 4,
  Sprint: 1 << 5,
  Crouch: 1 << 6,
} as const;
