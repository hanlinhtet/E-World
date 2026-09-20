# E-World — Magic: Spells & Skills

Magic is organized into **elements**, each with **tiered skills**. You learn the
tier-1 skill first, then buy tier-2 and tier-3 from the element's master NPC.

Data lives in [`apps/web/src/game/spells.ts`](../../apps/web/src/game/spells.ts)
(`SPELLS` map). Each spell has a **cast type** that defines how it behaves:

| Cast type    | Behavior |
| ------------ | -------- |
| `projectile` | A charged bolt thrown forward. **Hold** the cast button to charge — the orb grows bigger and hits harder (capped at full charge), and the bolt keeps growing as it flies. |
| `arc`        | Lobbed to a **ground target marker** where you aim, rising at ~45°. **Explodes** on impact for area damage. |
| `breath`     | A wave of flame sweeping an **area in front** of the caster (length × width). |
| `self`       | Affects the caster (e.g. Healing). |

## Controls

- **1 / 2 / 3 …** — select the active skill (only those you've learned)
- **Q** — quick-select the element's **arc** skill (e.g. Meteor Arc)
- **X** — cast the element's **breath** skill instantly (e.g. Dragon's Breath)
- **Right-click (hold)** — cast the active skill; hold to charge projectiles/arcs
- **Left-click** — gather (chop/mine) — never casts, so the two never conflict

## Elements

- [Fire](fire.md) — Fireball · Meteor Arc · Dragon's Breath
- [Water](water.md) — Water Beam · Ice Shard · Healing
- Earth, Lightning, Wind, Nature, Light, Dark — *planned* (see
  [`packages/shared` `Element`](../../packages/shared/src/enums/index.ts))

## Adding a new spell

1. Add an entry to `SPELLS` in `spells.ts` with a `castType` and params.
2. Add its key to `CASTABLE_ORDER`.
3. Sell it from an NPC in [`apps/web/src/game/npcs.ts`](../../apps/web/src/game/npcs.ts).
4. If it introduces a brand-new cast behavior, handle it in
   [`Combat.tsx`](../../apps/web/src/game/Combat.tsx) / `Projectiles.tsx`.
