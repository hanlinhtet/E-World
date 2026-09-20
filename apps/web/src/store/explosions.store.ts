import { create } from 'zustand';

export type ExplosionKind = 'blast' | 'vortex' | 'geyser';

export interface Explosion {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  start: number;
  kind: ExplosionKind;
}

interface ExplosionsState {
  explosions: Explosion[];
  add: (x: number, y: number, z: number, radius: number, color: string, now: number, kind?: ExplosionKind) => void;
  prune: (now: number) => void;
}

let seq = 0;

/** Short expanding effects: meteor blasts, updraft vortexes, etc. */
export const useExplosionsStore = create<ExplosionsState>((set) => ({
  explosions: [],
  add: (x, y, z, radius, color, now, kind = 'blast') =>
    set((s) => ({ explosions: [...s.explosions, { id: ++seq, x, y, z, radius, color, start: now, kind }].slice(-10) })),
  prune: (now) =>
    set((s) => {
      const live = s.explosions.filter((e) => now - e.start < 700);
      return live.length === s.explosions.length ? s : { explosions: live };
    }),
}));
