# E-World — Networking & Auth Flows

## Authentication flow (Google OAuth + JWT rotation)

```
Browser            NestJS                 Google           Postgres
   │  GET /api/auth/google                                    │
   │ ───────────────▶ redirect ──────────▶ consent           │
   │ ◀───────────────────────────────────  code              │
   │  GET /api/auth/google/callback?code=…                    │
   │ ───────────────▶ exchange ──────────▶ profile           │
   │                  find/create User + Player ─────────────▶│
   │                  issue access JWT (15m)                  │
   │                  + refresh token (store HASH) ──────────▶│
   │ ◀── 302 to web /auth/callback#access_token=…             │
   │      (refresh token set as httpOnly cookie)              │
   │                                                          │
   │  later: 401 on access token                              │
   │  POST /api/auth/refresh (cookie) ──▶ rotate ────────────▶│
   │ ◀── new access token (+ rotated refresh cookie)          │
```

- **Access token:** short-lived (15 min) JWT, sent as `Authorization: Bearer`. Held in memory only.
- **Refresh token:** opaque 48-byte random, stored only as an HMAC hash, in an httpOnly+secure cookie
  scoped to `/api/auth`. Rotated on every use; **reuse of a revoked token revokes the whole family**.
- **Sockets** authenticate by passing the current access token in the Socket.IO handshake `auth`.

## Realtime loop (Socket.IO)

```
Client                                   Server (GameGateway)
  │  handshake { auth: { token } }          verify access JWT
  │ ───────────────────────────────────▶   load profile, register session
  │ ◀── s:welcome { uid, serverTime }       join room world:<id>
  │
  │  c:input { seq, dt, buttons, look }      validate (Zod) → apply to sim
  │ ───────────────────────────────────▶    (reach/speed checks, Phase 2)
  │                                          mark session dirty
  │ ◀── s:snapshot { tick, ackSeq, players } broadcast @ SNAPSHOT_RATE (10Hz)
  │  reconcile: rewind to ackSeq, replay
  │  unacked inputs from the ring buffer
  │
  │  c:chat / c:interact / c:ping            handled per event
  │ ◀── s:chat / s:weather / s:pong
```

- **Tick:** the authoritative sim runs at `TICK_RATE` (20 Hz, `FIXED_DT`); snapshots broadcast at
  `SNAPSHOT_RATE` (10 Hz) to save bandwidth.
- **Interest management (Phase 2):** rooms become AOI cells (`AOI_CELL_SIZE`) so a client only receives
  entities near it. The protocol (`packages/protocol`) is unchanged by this — only the broadcast
  target narrows.
- **Persistence:** sessions are flushed write-behind (every 5 s + on disconnect + on critical events).
- **Scale:** adding the Socket.IO **Redis adapter** lets multiple server nodes share rooms/broadcasts
  with no protocol change. The `SessionRegistry` is the seam to move hot state into Redis.

## Wire contracts

All messages are defined and validated in [`packages/protocol`](../packages/protocol/src/index.ts).
The server **never trusts client input** — every inbound payload is parsed with a Zod schema before
it touches the simulation, and all state-changing outcomes are computed server-side.
