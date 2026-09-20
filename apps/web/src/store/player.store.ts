import { create } from 'zustand';
import type { Look, PlayerStats, Vec3 } from '@eworld/shared';

interface PlayerState {
  position: Vec3;
  look: Look;
  stats: PlayerStats | null;
  grounded: boolean;
  health: number;
  maxHealth: number;
  hurtAt: number; // ms timestamp of last damage (for HUD flash)
  invulnUntil: number;
  /** pending knockback impulse (consumed + zeroed by the controller each frame) */
  knock: { x: number; y: number; z: number };
  /** recent incoming-attack directions (world angle) for the HUD indicator */
  hits: { id: number; angle: number; at: number }[];
  applyImpulse: (x: number, y: number, z: number) => void;
  setStats: (stats: PlayerStats) => void;
  setGrounded: (grounded: boolean) => void;
  damage: (n: number, now: number, srcX?: number, srcZ?: number) => void;
  heal: (n: number) => void;
  revive: (now: number) => void;
}

/** Local predicted player state + live vitals. The render loop mutates
 *  position/look via refs; this store holds values the React UI observes. */
export const usePlayerStore = create<PlayerState>((set, get) => ({
  position: { x: 0, y: 60, z: 0 },
  look: { yaw: 0, pitch: 0 },
  stats: null,
  grounded: true,
  health: 100,
  maxHealth: 100,
  hurtAt: 0,
  invulnUntil: 0,
  knock: { x: 0, y: 0, z: 0 },
  hits: [],
  // Mutated in place (not via set) so it doesn't trigger React re-renders.
  applyImpulse: (x, y, z) => {
    const k = get().knock;
    k.x += x;
    k.y += y;
    k.z += z;
  },
  setStats: (stats) => set({ stats }),
  setGrounded: (grounded) => set({ grounded }),
  damage: (n, now, srcX, srcZ) => {
    if (now < get().invulnUntil) return;
    set((s) => ({ health: Math.max(0, s.health - n), hurtAt: now }));
    if (srcX !== undefined && srcZ !== undefined) {
      const p = get().position;
      const hits = get().hits;
      hits.push({ id: now + hits.length, angle: Math.atan2(srcX - p.x, srcZ - p.z), at: now });
      if (hits.length > 12) hits.splice(0, hits.length - 12);
    }
  },
  heal: (n) => set((s) => ({ health: Math.min(s.maxHealth, s.health + n) })),
  revive: (now) => set((s) => ({ health: s.maxHealth, invulnUntil: now + 2500 })),
}));
