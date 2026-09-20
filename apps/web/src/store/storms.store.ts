import { create } from 'zustand';

export interface Storm {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  damage: number;
  stun: number;
  color: string;
  start: number;
  duration: number;
  lastStrike: number; // mutated
}

interface StormsState {
  storms: Storm[];
  add: (s: Omit<Storm, 'id'>) => void;
  remove: (id: number) => void;
}

let seq = 0;

export const useStormsStore = create<StormsState>((set) => ({
  storms: [],
  add: (s) => set((st) => ({ storms: [...st.storms, { ...s, id: ++seq }].slice(-3) })),
  remove: (id) => set((st) => ({ storms: st.storms.filter((x) => x.id !== id) })),
}));
