/**
 * Magic system data. Spells are grouped by element; each element has tiered
 * skills with a distinct cast behavior:
 *   - projectile : a charged bolt thrown forward (hold to grow bigger/stronger)
 *   - arc        : lobbed to a ground target marker at ~45°, explodes on impact
 *   - breath     : a wave of flame over an area in front of the caster
 * Docs: see docs/spells/.
 */
export type CastType = 'projectile' | 'arc' | 'breath' | 'self' | 'updraft' | 'tornado' | 'geyser' | 'wave' | 'chain' | 'thunder' | 'storm';

export interface SpellDef {
  key: string;
  name: string;
  icon: string;
  element: string;
  tier: number;
  castType: CastType;
  color: string;
  damage: number;
  cooldownMs: number;
  /** projectile/arc */
  speed?: number;
  radius?: number;
  /** arc explosion radius */
  aoe?: number;
  /** breath area (meters) */
  length?: number;
  width?: number;
  /** knockback force applied to entities (and the caster) in the blast */
  knock?: number;
  /** upward launch force (updraft / geyser) */
  launch?: number;
  /** effect duration in ms (tornado) */
  duration?: number;
  /** soak/slow applied to hit enemies, in ms (water) */
  slow?: number;
  /** non-lethal hit bubbles the enemy into the air for this long (ms) */
  bubble?: number;
  /** electric stun applied to hit enemies, in ms */
  stun?: number;
  /** chain lightning: how many extra targets it jumps to, and jump radius */
  chainCount?: number;
  chainRadius?: number;
  /** targeting range (chain) */
  range?: number;
}

export const SPELLS: Record<string, SpellDef> = {
  // ── Fire ──
  fireball: { key: 'fireball', name: 'Fireball', icon: '🔥', element: 'fire', tier: 1, castType: 'projectile', color: '#ff7a2a', damage: 30, speed: 32, radius: 1.0, cooldownMs: 420 },
  meteor_arc: { key: 'meteor_arc', name: 'Meteor Arc', icon: '☄️', element: 'fire', tier: 2, castType: 'arc', color: '#ff4a1f', damage: 60, speed: 40, radius: 2.6, aoe: 2.6, cooldownMs: 1200 },
  dragon_breath: { key: 'dragon_breath', name: "Dragon's Breath", icon: '🐉', element: 'fire', tier: 3, castType: 'breath', color: '#ff3a14', damage: 14, length: 26, width: 10, cooldownMs: 2600 },
  // ── Water ──
  water_beam: { key: 'water_beam', name: 'Water Beam', icon: '💧', element: 'water', tier: 1, castType: 'projectile', color: '#39a0ff', damage: 22, speed: 46, radius: 0.8, slow: 1200, bubble: 5000, cooldownMs: 300 },
  geyser: { key: 'geyser', name: 'Geyser', icon: '⛲', element: 'water', tier: 2, castType: 'geyser', color: '#3fb6ff', damage: 30, aoe: 4, knock: 6, launch: 16, slow: 2200, cooldownMs: 1300 },
  tsunami: { key: 'tsunami', name: 'Tsunami', icon: '🌊', element: 'water', tier: 3, castType: 'wave', color: '#2f8fd8', damage: 34, knock: 18, length: 48, width: 20, speed: 17, slow: 2500, cooldownMs: 3600 },
  // ── Air ──
  air_bomb: { key: 'air_bomb', name: 'Air Bomb', icon: '🌀', element: 'air', tier: 1, castType: 'projectile', color: '#bfe9ff', damage: 18, speed: 34, radius: 0.9, aoe: 3, knock: 13, cooldownMs: 500 },
  updraft: { key: 'updraft', name: 'Updraft', icon: '🌬️', element: 'air', tier: 2, castType: 'updraft', color: '#cdeeff', damage: 26, aoe: 4.5, knock: 8, launch: 17, cooldownMs: 1300 },
  tornado: { key: 'tornado', name: 'Tornado', icon: '🌪️', element: 'air', tier: 3, castType: 'tornado', color: '#a9dcff', damage: 9, aoe: 5, knock: 4, duration: 2800, cooldownMs: 3400 },
  // ── Lightning ──
  chain_lightning: { key: 'chain_lightning', name: 'Chain Lightning', icon: '⚡', element: 'lightning', tier: 1, castType: 'chain', color: '#c8e6ff', damage: 26, range: 34, chainCount: 4, chainRadius: 12, stun: 500, cooldownMs: 500 },
  thunder_strike: { key: 'thunder_strike', name: 'Thunder Strike', icon: '🌩️', element: 'lightning', tier: 2, castType: 'thunder', color: '#a6d4ff', damage: 55, aoe: 4, stun: 1400, cooldownMs: 1300 },
  lightning_storm: { key: 'lightning_storm', name: 'Lightning Storm', icon: '⛈️', element: 'lightning', tier: 3, castType: 'storm', color: '#bfe0ff', damage: 14, aoe: 8, stun: 700, duration: 3200, cooldownMs: 4200 },
};

/** Castable spells in display order. */
export const CASTABLE_ORDER = ['fireball', 'meteor_arc', 'dragon_breath', 'water_beam', 'geyser', 'tsunami', 'air_bomb', 'updraft', 'tornado', 'chain_lightning', 'thunder_strike', 'lightning_storm'];

/** Charge mechanic: hold to power up. Full charge multiplies damage/size. */
export const CHARGE_TIME_MS = 1100;
export const MAX_DMG_MULT = 2.4;
export const MAX_SIZE_MULT = 1.9;
/** Meteor circle/blast grows by this fraction at full charge (capped). */
export const ARC_GROW = 1.1;
/** Dragon's Breath range extends by this fraction at full hold (capped). */
export const BREATH_GROW = 1.0;

export function chargeFraction(heldMs: number): number {
  return Math.max(0, Math.min(1, heldMs / CHARGE_TIME_MS));
}

export function spellDef(key: string): SpellDef | undefined {
  return SPELLS[key];
}

/** Elements in number-key order: 1 = fire, 2 = water, 3 = air. */
export const ELEMENTS = ['fire', 'water', 'air', 'lightning'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_INFO: Record<string, { name: string; icon: string; color: string }> = {
  fire: { name: 'Fire', icon: '🔥', color: '#ff6320' },
  water: { name: 'Water', icon: '💧', color: '#39a0ff' },
  air: { name: 'Air', icon: '🌀', color: '#bfe9ff' },
  lightning: { name: 'Lightning', icon: '⚡', color: '#c8e6ff' },
};

/** The spell at a given element + tier (1/2/3), regardless of whether learned. */
export function spellByElementTier(element: string, tier: number): SpellDef | undefined {
  return Object.values(SPELLS).find((s) => s.element === element && s.tier === tier);
}

