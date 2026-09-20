/** Game-wide tunable constants. Single source of truth for both client and server. */
import { Rarity } from '../enums/index';

/** Server simulation tick rate (Hz) and derived fixed timestep (seconds). */
export const TICK_RATE = 20;
export const FIXED_DT = 1 / TICK_RATE;

/** Network snapshot broadcast rate (Hz). Lower than tick to save bandwidth. */
export const SNAPSHOT_RATE = 10;

/** World partitioning (meters). */
export const CHUNK_SIZE = 64;
export const AOI_CELL_SIZE = 256;
/** Default client view distance in chunks. */
export const DEFAULT_RENDER_DISTANCE = 6;

/** XP required to reach the *next* level from the given level (classic RPG curve). */
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Inventory limits. */
export const INVENTORY_COLS = 8;
export const INVENTORY_ROWS = 6;
export const INVENTORY_SLOTS = INVENTORY_COLS * INVENTORY_ROWS;
export const QUICK_BAR_SLOTS = 8;
export const BASE_CARRY_WEIGHT = 100;

/** Movement speeds (m/s). */
export const MOVE_SPEED = {
  walk: 4,
  sprint: 7.5,
  crouch: 1.8,
  swim: 3,
  climb: 2,
} as const;

export const JUMP_VELOCITY = 8; // m/s (≈1.6 m hop under the gravity below)
export const GRAVITY = 20; // m/s^2

/** Multipliers applied to base market price by rarity. */
export const RARITY_PRICE_MULTIPLIER: Record<Rarity, number> = {
  [Rarity.Common]: 1,
  [Rarity.Uncommon]: 2.5,
  [Rarity.Rare]: 6,
  [Rarity.Epic]: 15,
  [Rarity.Legendary]: 40,
  [Rarity.Mythic]: 120,
};

/** Anti-cheat: max plausible horizontal speed (m/s) before flagging. */
export const MAX_VALIDATED_SPEED = 12;
