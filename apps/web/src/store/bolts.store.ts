import { create } from 'zustand';

/** A short-lived jagged lightning arc between two points. */
export interface Bolt {
  id: number;
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  color: string;
  start: number;
}

interface BoltsState {
  bolts: Bolt[];
  add: (a: [number, number, number], b: [number, number, number], color: string, now: number) => void;
  prune: (now: number) => void;
}

let seq = 0;

export const useBoltsStore = create<BoltsState>((set) => ({
  bolts: [],
  add: (a, b, color, now) =>
    set((s) => ({ bolts: [...s.bolts, { id: ++seq, ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2], color, start: now }].slice(-40) })),
  prune: (now) =>
    set((s) => {
      const live = s.bolts.filter((x) => now - x.start < 160);
      return live.length === s.bolts.length ? s : { bolts: live };
    }),
}));
