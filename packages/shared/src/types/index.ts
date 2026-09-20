/** Shared domain types. These describe data as it flows between client and server. */
import type {
  Biome,
  Element,
  EquipmentSlot,
  ItemCategory,
  MovementAbility,
  Rarity,
  ResourceKind,
  TimePhase,
  UserRole,
  WeatherKind,
} from '../enums/index';

/** Cartesian world position in meters. y is up. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Yaw/pitch in radians (FPS camera). */
export interface Look {
  yaw: number;
  pitch: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Live vitals. Progression (level/xp/coins) is tracked separately on the profile. */
export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
}

export interface PlayerState {
  uid: string;
  username: string;
  position: Vec3;
  look: Look;
  worldId: string;
  biome: Biome;
  stats: PlayerStats;
  elements: Element[];
  unlockedAbilities: MovementAbility[];
}

export interface InventoryItem {
  id: string;
  itemKey: string;
  category: ItemCategory;
  quantity: number;
  slot: number;
  weight: number;
  rarity: Rarity;
  metadata?: Record<string, unknown>;
}

export interface EquippedItem {
  slot: EquipmentSlot;
  itemKey: string;
  rarity: Rarity;
}

export interface ResourceNodeState {
  id: string;
  kind: ResourceKind;
  position: Vec3;
  rarity: Rarity;
  remaining: number;
  respawnAt: string | null;
}

/** Pure-function output of the sky model for a given moment. */
export interface SkyState {
  /** 0..1 fraction of the 24h day. 0 = midnight. */
  dayFraction: number;
  phase: TimePhase;
  sunDirection: Vec3;
  moonDirection: Vec3;
  /** linear sRGB sky zenith color */
  skyColor: [number, number, number];
  fogColor: [number, number, number];
  fogDensity: number;
  starIntensity: number;
  sunIntensity: number;
}

export interface WeatherState {
  kind: WeatherKind;
  intensity: number; // 0..1
  windDirection: number; // radians
  windSpeed: number; // m/s
}

export interface Achievement {
  key: string;
  progress: number;
  target: number;
  unlockedAt: string | null;
}

/** Shape returned by GET /player/me — identity plus live progression. */
export interface MeResponse extends UserProfile {
  level: number;
  xp: number;
  coins: number;
  stats: PlayerStats;
  position: Vec3;
  look: Look;
  worldId: string;
  elements: Element[];
  skills: string[];
}

export interface PlayerSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  fov: number;
  renderDistance: number; // chunks
  shadows: 'off' | 'low' | 'high';
}

/** A success/failure envelope for service results that avoids throwing across boundaries. */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };
