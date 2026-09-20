import { create } from 'zustand';

export interface Burst {
  id: number;
  x: number;
  y: number;
  z: number;
  color: string;
  start: number; // ms
}

interface EffectsStore {
  bursts: Burst[];
  spawnBurst: (x: number, y: number, z: number, color: string, now: number) => void;
  prune: (now: number) => void;
}

let seq = 0;

/** Short-lived impact particle bursts spawned at harvest hits. */
export const useEffectsStore = create<EffectsStore>((set) => ({
  bursts: [],
  spawnBurst: (x, y, z, color, now) =>
    set((s) => ({ bursts: [...s.bursts, { id: ++seq, x, y, z, color, start: now }].slice(-12) })),
  prune: (now) =>
    set((s) => {
      const live = s.bursts.filter((b) => now - b.start < 600);
      return live.length === s.bursts.length ? s : { bursts: live };
    }),
}));
