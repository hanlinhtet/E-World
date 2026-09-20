# E-World — Architecture

This document is the authoritative high-level design. It explains *why* the system is shaped the
way it is. Detailed schemas live in [`ERD.md`](ERD.md); networking in [`NETWORKING.md`](NETWORKING.md);
the build order in [`ROADMAP.md`](ROADMAP.md).

---

## 1. Guiding principles

1. **Server-authoritative, client-predictive.** The server owns all state that affects fairness or
   persistence (inventory, coins, combat outcomes, XP, position validation). The client predicts
   movement locally for responsiveness and reconciles against server corrections. Never trust the
   client.
2. **Deterministic world.** The world is *procedurally generated from a single seed*. Terrain,
   biomes, resource nodes, and POIs are a pure function of `(seed, coordinate)`. This is the only way
   to have a "huge seamless world, no loading screen" without shipping or streaming gigabytes of
   handcrafted geometry — the client regenerates terrain locally and the server validates against the
   same function. Handcrafted set-pieces (capital city, temples, dungeons) are *overlaid* on top of
   the procedural base.
3. **Clean architecture + domain isolation.** Game rules live in `packages/game-core` and are
   independent of HTTP, sockets, React, and Three.js. The same logic runs on the server (authority)
   and client (prediction), guaranteeing they agree.
4. **Everything typed end-to-end.** Shared types (`packages/shared`) and Zod network contracts
   (`packages/protocol`) mean the wire format is a single source of truth for both sides.
5. **Built to scale horizontally.** Stateless REST nodes + Socket.IO with a Redis adapter + interest
   management means we can add server instances without rewrites.

## 2. System topology

```
                    ┌──────────────────────────────────────────────┐
   Browser          │                  Backend                     │
 ┌──────────┐  REST │  ┌────────────┐   ┌──────────────────────┐   │
 │ Next.js  │──────────│  NestJS    │───│  PostgreSQL (Prisma) │   │
 │  + R3F   │       │  │  REST API  │   └──────────────────────┘   │
 │          │  WS   │  │  + Auth    │   ┌──────────────────────┐   │
 │ Zustand  │══════════│  Socket.IO │═══│  Redis (adapter,     │   │
 │ stores   │       │  │  Gateway   │   │  presence, pub/sub)  │   │
 └──────────┘       │  └────────────┘   └──────────────────────┘   │
       │            │        │           ┌──────────────────────┐   │
       │ assets     │        └───────────│  S3 / MinIO (assets) │   │
       └────────────────────────────────└──────────────────────┘   │
                    └──────────────────────────────────────────────┘
```

- **REST** handles auth, profile, inventory queries, shop transactions, quest state, admin — anything
  request/response and not latency-critical.
- **WebSocket (Socket.IO)** handles the realtime loop: movement, presence, combat events, chat,
  world events, weather sync. Rooms are keyed by **world region / AOI cell** so a client only receives
  updates for entities near it (interest management).
- **Redis** is the Socket.IO adapter (cross-node broadcast), the presence store, and a pub/sub bus
  for world events. It is *not* the source of truth — Postgres is.

## 3. Authority & the simulation loop

```
client input ──▶ predict locally ──▶ render immediately
      │                                   ▲
      ▼ (input frame, seq#)               │ reconcile on mismatch
   server ──▶ validate ──▶ apply to authoritative sim ──▶ snapshot ──┘
                                │
                                ▼ periodic persist (debounced) ──▶ Postgres
```

- The server runs a fixed-timestep **tick** (target 20 Hz) per active region. It ingests buffered
  client inputs, advances the authoritative simulation (movement collision, combat, AI, resource
  respawn), and emits delta snapshots to interested clients.
- Persistence is **write-behind**: hot state (position, inventory) lives in memory during a session
  and is flushed to Postgres on a debounce + on disconnect + on critical events (trade, level-up).
  This keeps the DB from being a per-tick bottleneck.
- The client reconciles: it keeps a ring buffer of unacknowledged inputs; on a server snapshot it
  rewinds to the snapshot state and re-applies pending inputs (standard rollback netcode).

## 4. World model

- **Coordinates:** world space is metric (meters). The world is divided into **chunks** (e.g. 64 m²)
  for terrain streaming and into coarser **AOI cells** (e.g. 256 m²) for network interest.
- **Terrain:** heightfield from layered simplex noise → biome assignment from (elevation, moisture,
  temperature) → mesh generated in a Web Worker, LOD by distance. See `packages/game-core/world`.
- **Entities:** resource nodes, NPCs, monsters, loot, players. Static entities (ore veins) are
  deterministic from seed; dynamic entities (monsters, dropped loot) are server-spawned and synced.
- **Regions/biomes:** Forest, Mountain, Snow, Desert, Beach, Ocean, Volcano, Swamp, Ruins, Village,
  Capital City, Magic Academy, Ancient Temple, Sky Island, Dungeon, Mine, Underground Cave, Boss Area.

## 5. Time & weather

- Game time is derived from the **player's local timezone** (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
  mapped to an in-game sky state. No manual selection. The server validates time-gated logic
  (shop hours, night monsters) against the player's reported offset within sane bounds.
- A shared **sky/weather model** in `game-core` computes sun/moon position, fog density, sky gradient,
  and star visibility as a pure function of time-of-day. Weather is server-driven per region and
  broadcast so all nearby players see the same storm.

## 6. Frontend rendering pipeline

`React Three Fiber` declarative scene graph over Three.js:

- **Performance budget: 60 FPS.** Techniques: frustum culling, `InstancedMesh` for vegetation/rocks,
  geometry/material instancing, LOD groups, chunk load/unload, texture streaming + KTX2/Basis
  compression, Web Workers for terrain meshing and pathfinding, draw-call batching.
- **FPS camera only.** First-person rig renders view-model hands/tools/weapons on a separate layer
  with its own near-plane to avoid clipping.
- **State:** Zustand stores split by concern (player, world, inventory, ui, net). The render loop
  reads from refs/stores without causing React re-renders on the hot path.

## 7. Security

- Google OAuth → server issues short-lived **access JWT** (15 min) + rotating **refresh token**
  (httpOnly, secure cookie, 30 days, reuse-detection). Sockets authenticate with the access token.
- All gameplay-affecting actions are validated server-side: reach checks, cooldowns, inventory
  ownership, anti-speed/teleport heuristics, rate limiting (Redis). Admin endpoints are RBAC-gated.

## 8. Why these choices (trade-offs)

| Decision | Alternative | Why we chose it |
| --- | --- | --- |
| Procedural seed world | Hand-authored streamed meshes | Infinite/huge world with tiny payload; client+server agree by construction. Trade-off: art direction is constrained by the generator, so we overlay handcrafted POIs. |
| Server-authoritative | Peer/client-authoritative | Cheating resistance & consistent economy. Trade-off: needs prediction/reconciliation to feel responsive. |
| Socket.IO + Redis adapter | Raw `ws`, or a dedicated game-server (Colyseus/Agones) | Fastest path to multiplayer with rooms, reconnection, and horizontal scale; can later extract a dedicated realtime app without changing the protocol package. |
| Monorepo (pnpm+turbo) | Polyrepo | Shared types/contracts/logic with one source of truth; atomic cross-cutting changes. |
| Write-behind persistence | Write-through per action | DB survives hundreds of players; trade-off: needs careful flush-on-critical-event + crash recovery. |

## 9. Module boundaries (dependency rule)

```
apps/web  ─┐
apps/admin ─┼─▶ packages/shared ◀─┬─ apps/server
           └─▶ packages/protocol ◀┘
apps/web ───▶ packages/game-core ◀── apps/server
```

`game-core`, `shared`, and `protocol` never import from `apps/*`. This keeps domain logic pure and
reusable, and is what lets the same simulation run authoritatively on the server and predictively on
the client.
