import { create } from 'zustand';

/** An active Dragon's Breath flame field (burns for a short duration). */
export interface Breath {
  id: number;
  ox: number;
  oz: number;
  dx: number;
  dz: number;
  length: number;
  width: number;
  color: string;
  damage: number; // per damage tick
  start: number;
  duration: number;
  lastTick: number; // mutated by the effect for damage-over-time
}

interface BreathsState {
  breaths: Breath[];
  add: (b: Omit<Breath, 'id'>) => void;
  remove: (id: number) => void;
}

let seq = 0;

export const useBreathsStore = create<BreathsState>((set) => ({
  breaths: [],
  add: (b) => set((s) => ({ breaths: [...s.breaths, { ...b, id: ++seq }].slice(-4) })),
  remove: (id) => set((s) => ({ breaths: s.breaths.filter((x) => x.id !== id) })),
}));
