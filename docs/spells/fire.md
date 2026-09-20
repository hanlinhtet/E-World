# Fire Element

Taught by **Pyra, the Fire Mage** (near spawn). Learn Fireball first; Meteor Arc
and Dragon's Breath are purchased after.

| # | Skill | Key | Cast | Effect |
| - | ----- | --- | ---- | ------ |
| 1 | **Fireball** | `1`, hold RMB | projectile | A charged bolt of flame. Hold to grow it bigger and stronger (and it keeps growing as it flies). Base 30 dmg, up to 2.4× charged. |
| 2 | **Meteor Arc** | `Q`, hold RMB | arc | A ground circle marks where you aim; release to lob a meteor in a 45° arc that **explodes** on impact (≈4.5 m radius). Base 60 dmg + charge. |
| 3 | **Dragon's Breath** | `X` | breath | A dragon sweeps overhead and rains flame over a 16 m × 6 m strip in front of you, burning everything in it. |

## Tuning

All numbers live in `SPELLS.fire*` in
[`apps/web/src/game/spells.ts`](../../apps/web/src/game/spells.ts):

```ts
fireball:      { castType: 'projectile', damage: 30, speed: 32, radius: 1.0, cooldownMs: 420 }
meteor_arc:    { castType: 'arc',        damage: 60, speed: 26, radius: 1.3, aoe: 4.5, cooldownMs: 1200 }
dragon_breath: { castType: 'breath',     damage: 16, length: 16, width: 6, cooldownMs: 2200 }
```

Damage is dealt to animals and monsters; hits show floating red numbers so you
can read how much HP a target has.
