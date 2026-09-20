import { create } from 'zustand';

export interface Projectile {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  radius: number;
  damage: number;
  bornAt: number;
  /** visual sphere radius (overrides collision radius for rendering) */
  visual?: number;
  /** radius growth per second while flying (charged shots keep swelling) */
  grow?: number;
  /** gravity (m/s²); arc shots use a strong value, bolts a gentle one */
  grav?: number;
  /** explosion radius on impact; 0/undefined = single-target */
  aoe?: number;
  /** fire spell — lights campfires it strikes */
  ignites?: boolean;
  /** knockback force applied in the blast (air spells) */
  knock?: number;
  /** soak/slow applied to hit enemies, in ms (water spells) */
  slow?: number;
  /** non-lethal hit bubbles the enemy for this long (ms) */
  bubble?: number;
}

interface CombatState {
  /** selected element ('fire' | 'water' | 'air'); RMB/Q/X cast its tier 1/2/3 */
  activeElement: string;
  /** ms timestamp the current charge began (0 = not charging) + which spell */
  chargeStart: number;
  chargingSpell: string | null;
  projectiles: Projectile[];
  setActiveElement: (element: string) => void;
  beginCharge: (spell: string, now: number) => void;
  endCharge: () => void;
  addProjectile: (p: Projectile) => void;
  removeProjectile: (id: string) => void;
}

/** Active spell selection + live projectiles in the world. Projectile motion is
 *  integrated in the Projectiles component; this store holds spawn/despawn. */
export const useCombatStore = create<CombatState>((set) => ({
  activeElement: 'fire',
  chargeStart: 0,
  chargingSpell: null,
  projectiles: [],
  setActiveElement: (element) => set((s) => (s.activeElement === element ? s : { activeElement: element })),
  beginCharge: (spell, now) => set({ chargeStart: now, chargingSpell: spell }),
  endCharge: () => set((s) => (s.chargeStart === 0 ? s : { chargeStart: 0, chargingSpell: null })),
  addProjectile: (p) => set((s) => ({ projectiles: [...s.projectiles, p] })),
  removeProjectile: (id) => set((s) => ({ projectiles: s.projectiles.filter((p) => p.id !== id) })),
}));
