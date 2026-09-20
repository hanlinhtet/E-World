import { create } from 'zustand';

export interface DamageNumber {
  id: number;
  x: number;
  y: number;
  z: number;
  amount: number;
  big: boolean; // charged/critical → larger
  start: number; // ms
}

interface DamageStore {
  numbers: DamageNumber[];
  add: (x: number, y: number, z: number, amount: number, big: boolean, now: number) => void;
  prune: (now: number) => void;
}

let seq = 0;

/** Floating combat damage numbers shown where a hit lands. */
export const useDamageStore = create<DamageStore>((set) => ({
  numbers: [],
  add: (x, y, z, amount, big, now) =>
    set((s) => ({ numbers: [...s.numbers, { id: ++seq, x, y, z, amount, big, start: now }].slice(-24) })),
  prune: (now) =>
    set((s) => {
      const live = s.numbers.filter((n) => now - n.start < 1100);
      return live.length === s.numbers.length ? s : { numbers: live };
    }),
}));
