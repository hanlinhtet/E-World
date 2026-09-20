import { create } from 'zustand';

/** A surging Tsunami wall that advances forward, sweeping entities. */
export interface Wave {
  id: number;
  ox: number;
  oz: number;
  dx: number;
  dz: number;
  length: number;
  width: number;
  speed: number;
  damage: number;
  knock: number;
  slow: number;
  color: string;
  start: number;
  hit: Set<string>; // entity ids already swept (mutated)
}

interface WavesState {
  waves: Wave[];
  add: (w: Omit<Wave, 'id' | 'hit'>) => void;
  remove: (id: number) => void;
}

let seq = 0;

export const useWavesStore = create<WavesState>((set) => ({
  waves: [],
  add: (w) => set((s) => ({ waves: [...s.waves, { ...w, id: ++seq, hit: new Set<string>() }].slice(-3) })),
  remove: (id) => set((s) => ({ waves: s.waves.filter((x) => x.id !== id) })),
}));
