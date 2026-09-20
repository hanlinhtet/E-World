# E-World — Phased Roadmap

Each phase is **production-ready before the next begins**: typed, tested where it matters, documented,
and runnable. Phases are sequenced so every layer has a solid foundation beneath it.

Legend: ✅ done · 🔨 in progress · ⬜ planned

---

## Phase 0 — Foundation & Skeleton  🔨
Goal: a runnable, fully-typed monorepo skeleton that everything else plugs into.
- ✅ Monorepo (pnpm + Turborepo), base TS/ESLint/Prettier, Docker Compose (Postgres/Redis/MinIO)
- ✅ `packages/shared` (core enums, types, constants), `packages/protocol` (socket contracts)
- ✅ Prisma schema for the full player profile + core domain entities
- ✅ NestJS skeleton: Google OAuth, JWT access+refresh, `PlayerModule`, Socket.IO gateway
- ✅ Next.js skeleton: R3F canvas with FPS controls, Zustand stores, login flow
- ✅ Admin app skeleton
- 🔨 `docs/` (this file + architecture, ERD, networking)

## Phase 1 — Identity & Persistence  ⬜
- Full Google OAuth round-trip, refresh-token rotation + reuse detection, session management
- Player profile CRUD, settings, last-login, auto-create on first login
- S3 avatar pipeline; presence (online/offline) via Redis

## Phase 2 — World & Movement  ⬜
- Deterministic terrain generation (noise → biomes) in `game-core`, Web Worker meshing, LOD + chunk streaming
- FPS controller: walk, sprint, jump, crouch, slide, swim, climb, glide (server-validated)
- Client prediction + server reconciliation for movement; AOI interest management

## Phase 3 — Time, Sky & Weather  ⬜
- Local-timezone → game time; smooth sunrise/day/sunset/night/midnight transitions
- Dynamic sky, fog, moon, stars, moving clouds; biome-driven ambient audio
- Server-driven weather per region (sun/cloud/rain/storm/snow/fog/wind) with gameplay effects

## Phase 4 — Resources, Mining & Inventory  ⬜
- Resource node entities (respawn, rarity, weight, price), interactive mining with tool tiers
- Grid inventory: drag/drop, sort/filter/search, stacking, weight, equipment + quick bar
- Physical loot drops; rare veins; hidden caves

## Phase 5 — Crafting & Economy  ⬜
- Recipe system + unlock progression; crafting stations
- NPC shops (buy/sell), coins, market prices; foundation for player marketplace/auction house

## Phase 6 — NPCs, Dialogue & Quests  ⬜
- NPC schedules, homes, jobs, dialogue trees, friendship/reputation, memory of player actions
- Quest engine: main/side/guild/daily/weekly/hidden/world quests; rewards & area unlocks

## Phase 7 — Skills, Magic & Combat  ⬜
- Skill trees (movement/combat/gathering) bought from NPC masters
- Element system (fire/water/earth/lightning/wind/nature/light/dark) with per-element trees
- FPS combat: melee/bow/magic, dodge/block/parry/crit, element combos; enemy AI & boss mechanics
- Wildlife (passive/aggressive/flying/sea/legendary)

## Phase 8 — Multiplayer Depth  ⬜
- Chat, friends, parties, guilds, trading, world events, PvP zones
- Scale hardening: Redis-adapter multi-node, load tests for hundreds of concurrent players

## Phase 9 — Admin, Telemetry & Live-Ops  ⬜
- Full admin dashboard (players, NPCs, monsters, world, items, quests, economy, analytics,
  live players, server health, announcements, events, bans/moderation)

## Phase 10 — Polish, Performance & Launch  ⬜
- 60 FPS pass (LOD/instancing/streaming/workers), audio pass, accessibility, save-system hardening
- Full test + docs pass; deployment guide; observability (metrics, logs, traces)

## Future expansion (architected for, not yet built)
New continents · classes · mounts · sailing · flying creatures · underwater cities · space worlds ·
guild wars · PvP arenas · cross-server events · seasonal events · pets · companion AI · farming ·
fishing tournaments · player housing · cross-platform launcher · native mobile · desktop launcher · VR.
