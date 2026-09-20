# 🌍 E-World

A browser-based **open-world multiplayer RPG** — realistic 3D, first-person, seamless world,
day/night + weather, mining, crafting, skills, magic, quests, NPCs, and economy. Built to be
production-quality, scalable, and expandable for years.

Inspired by Minecraft (systems depth), Genshin Impact (elements & exploration),
Valheim (survival/crafting), RuneScape (skills & economy), and Zelda (discovery).

---

## Tech stack

| Layer        | Tech                                                                             |
| ------------ | -------------------------------------------------------------------------------- |
| Frontend     | Next.js · React · TypeScript · React Three Fiber · Three.js · Drei · Zustand · Framer Motion · TailwindCSS |
| Backend      | Node.js · NestJS · TypeScript                                                    |
| Realtime     | Socket.IO (Redis adapter for horizontal scale)                                  |
| Database     | PostgreSQL + Prisma ORM                                                          |
| Storage      | S3-compatible (MinIO in dev)                                                     |
| Auth         | Google OAuth 2.0 · JWT access + refresh rotation                                 |
| Tooling      | pnpm workspaces · Turborepo · Docker / Docker Compose                            |

## Languages

The codebase is **TypeScript end-to-end** — the same language runs the game
client, the server, and the shared game logic, so types and rules are one source
of truth across the whole stack.

| Language | Where it's used |
| --- | --- |
| **TypeScript** (`.ts`) | Everything — server (NestJS), shared packages, game-core simulation, stores, config |
| **TSX / JSX** (`.tsx`) | React + React Three Fiber components (UI, 3D scene) |
| **Prisma schema** (`.prisma`) | Database schema / models ([`schema.prisma`](apps/server/prisma/schema.prisma)) |
| **SQL** (`.sql`) | Generated Prisma migrations |
| **CSS** | Tailwind directives + global styles |
| **JSON** | `package.json`, `tsconfig`, `turbo.json`, etc. |
| **YAML** (`.yml` / `.yaml`) | `docker-compose.yml`, `pnpm-workspace.yaml` |
| **Dockerfile** | Container builds for `web` and `server` |
| **JavaScript (ESM)** (`.mjs`) | A few build configs (PostCSS, Next) |
| **Markdown** (`.md`) | Docs (`docs/`, this README) |

> No second runtime language: there's **no Python/Go/Rust/Java** here. Shaders
> (GLSL) will appear later for advanced rendering, and GLTF/asset formats for 3D
> models — both are data, not new programming languages.

## Monorepo layout

```
e-world/
├── apps/
│   ├── web/         # Next.js game client (R3F renderer, FPS controls, UI)
│   ├── server/      # NestJS API + Socket.IO realtime + Prisma
│   └── admin/       # Next.js admin dashboard
├── packages/
│   ├── shared/      # Shared TS types, enums, game constants (client+server)
│   ├── protocol/    # Network message contracts (Zod-validated socket events)
│   └── game-core/   # Engine-agnostic deterministic game logic (sim, world gen, formulas)
├── docs/            # Architecture, ERD, API, networking, roadmap
├── docker-compose.yml
└── turbo.json
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for the phased build plan.

## What's playable now

- **Seamless procedural world** — chunked terrain, trees, rocks and props generated
  from a seed by [`packages/game-core`](packages/game-core), so client and server agree
  on the same world without shipping a map.
- **First-person exploration** — pointer-lock FPS controls, walk/sprint/jump, minimap
  and a full-screen world map.
- **Gathering & inventory** — chop trees, mine stone, loot chests, carry it all in a
  slot-based inventory.
- **Survival loop** — build a campfire, light it, cook raw meat, eat to heal.
- **Combat & magic** — monsters, animals and bandit camps; charged projectile spells,
  lobbed arc spells that explode on impact, and sweeping breath attacks, with damage
  numbers, hit indicators and explosions. See [`docs/spells/`](docs/spells/).
- **NPCs & shops** — talk to NPCs to buy items and learn higher-tier spells.
- **Weather & sky** — day/night cycle, storms, tornadoes and tsunamis.
- **Accounts** — Google OAuth sign-in with JWT access + refresh rotation, player
  profile and settings persisted in Postgres.

### Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move · hold `Shift` to sprint · `Space` to jump |
| Mouse | Look (click the canvas to lock the pointer, `Esc` to release) |
| **Left click** | Gather — chop / mine / hit |
| **Right click** (hold) | Cast the active spell — holding charges it |
| `F` / `Q` / `X` | Cast tier 1 / 2 / 3 of your element (e.g. Fireball · Meteor Arc · Dragon's Breath) |
| `E` | Interact — open an NPC's shop |
| `B` / `C` / `G` | Build a campfire · light it & cook · eat cooked meat |
| `I` / `M` | Toggle inventory · toggle world map |

## Ports

Host ports are deliberately offset from the defaults so E-World can run alongside
other local stacks. Change them via `*_PORT` in `.env`.

| Service | URL / port |
| --- | --- |
| Game client (`web`) | http://localhost:3000 |
| Admin dashboard (`admin`) | http://localhost:3001 |
| API + Socket.IO (`server`) | http://localhost:4000/api |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6380` |
| MinIO (API / console) | `localhost:9100` / `localhost:9101` |

## Quick start

> Requires Node ≥ 20, pnpm ≥ 9, Docker. (`corepack enable` or `npm i -g pnpm`.)

```bash
# 1. install
pnpm install

# 2. env
cp .env.example .env        # then fill GOOGLE_CLIENT_ID / SECRET

# 3. infra (Postgres :5433 + Redis :6380 + MinIO :9100/:9101)
#    Host ports are offset from the defaults so E-World coexists with other
#    local stacks. Adjust *_PORT in .env if those are taken too.
pnpm infra:up

# 4. database  (migrate prompts for a name on first run; e.g. "init")
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. run everything (web :3000, server :4000, admin :3001)
pnpm dev
```

## Scripts

All scripts run from the repo root and fan out through Turborepo.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run web, server and admin in watch mode (builds shared packages first) |
| `pnpm build` | Production build of every app and package |
| `pnpm typecheck` | Type-check the whole monorepo |
| `pnpm test` | Run tests (`game-core` uses Vitest) |
| `pnpm lint` / `pnpm format` | ESLint · Prettier |
| `pnpm infra:up` / `pnpm infra:down` | Start / stop Postgres + Redis + MinIO |
| `pnpm db:generate` · `db:migrate` · `db:seed` | Prisma client · migrations · seed data |

> The shared packages (`shared`, `protocol`, `game-core`) are **built to `dist`** and
> consumed from there by the server, so run them through the Turborepo scripts above —
> they handle the dependency ordering. `pnpm -r typecheck` does not.

## Status

This repository is being built **incrementally, phase by phase** — each phase is production-ready
before the next begins. Foundation, auth/persistence, world & movement, weather, gathering and the
first combat/magic systems are in; server-authoritative simulation, quests and live-ops are next.
Track progress in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## License

Not yet licensed for reuse — all rights reserved for now.
