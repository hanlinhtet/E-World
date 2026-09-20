import { create } from 'zustand';

export interface Tornado {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  damage: number; // per tick
  start: number;
  duration: number;
  lastTick: number; // mutated for DoT
}

interface TornadoesState {
  tornadoes: Tornado[];
  add: (t: Omit<Tornado, 'id'>) => void;
  remove: (id: number) => void;
}

let seq = 0;

export const useTornadoesStore = create<TornadoesState>((set) => ({
  tornadoes: [],
  add: (t) => set((s) => ({ tornadoes: [...s.tornadoes, { ...t, id: ++seq }].slice(-4) })),
  remove: (id) => set((s) => ({ tornadoes: s.tornadoes.filter((x) => x.id !== id) })),
}));
