# E-World — Entity Relationship Diagram

The authoritative schema is [`apps/server/prisma/schema.prisma`](../apps/server/prisma/schema.prisma).
This document explains the relationships and the reasoning behind the layout.

## Core relationships

```
User 1──1 Player                       (a login owns exactly one character)
User 1──* RefreshToken                 (rotating sessions, reuse detection)

Player 1──* InventoryItem *──1 ItemDefinition
Player 1──* Equipment
Player 1──* PlayerSkill   *──1 SkillDefinition
Player 1──* PlayerElement
Player 1──* PlayerQuest   *──1 QuestDefinition
Player 1──* PlayerAchievement *──1 AchievementDefinition
Player 1──* NpcRelationship   *──1 NpcDefinition

ItemDefinition 1──* RecipeIngredient *──1 CraftingRecipe 1──1 ItemDefinition(output)
ResourceDefinition 1──1 ItemDefinition(yield)

PointOfInterest 1──* Npc *──1 NpcDefinition
```

## Design notes

- **Definition vs. instance.** Anything designers tune (`ItemDefinition`, `SkillDefinition`,
  `QuestDefinition`, `NpcDefinition`, `ResourceDefinition`, `AchievementDefinition`) is a *definition*
  keyed by a stable string (`iron_pickaxe`, `double_jump`). Per-player rows reference the definition
  by key. This means content can be added/edited from the admin panel without migrations, and live
  player data stays small.
- **Hot state on `Player`.** Position, look, vitals, and `worldId` live as columns on `Player` and are
  written-behind from the in-memory sim (not per tick). `settings` and quest `progress` are `Json`
  for flexibility.
- **NPC memory & reputation** live on `NpcRelationship` (`memory` is a JSON event log) so an NPC can
  "remember" and react to a specific player.
- **Auth.** Only a *hash* of each refresh token is stored. Tokens belong to a rotation `family`;
  presenting a revoked token revokes the whole family (compromise response).
- **Live-ops.** `Announcement` and `AuditLog` back the admin dashboard; every privileged action is
  audit-logged.

## Indexing & integrity

- Unique constraints enforce one row per `(playerId, slot)`, `(playerId, skillKey)`,
  `(playerId, questKey)`, etc., preventing duplicate inventory/skill state.
- `onDelete: Cascade` from `Player`/`User` cleans up owned rows when an account is removed.
- Foreign keys to definition tables are *not* cascade — content definitions outlive player rows.

## Future-expansion hooks (no schema rewrite needed)

Housing (`LandPlot`, `Building`), guilds (`Guild`, `GuildMember`), marketplace (`MarketListing`,
`AuctionBid`), parties, mounts/pets, and seasonal events all attach as new tables referencing
`Player`/`User`. The definition-vs-instance pattern and JSON config columns keep these additive.
```
