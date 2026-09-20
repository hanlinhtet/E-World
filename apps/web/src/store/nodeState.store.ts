import { create } from 'zustand';

/** A runtime-spawned stone (stones don't regrow in place — they reappear elsewhere). */
export interface DynStone {
  id: string;
  x: number;
  z: number;
  y: number;
  scale: number;
}

interface NodeStateStore {
  /** node id → time (ms) it regrows; Infinity = permanently removed (mined stones) */
  broken: Record<string, number>;
  /** dynamically spawned stones */
  dynamic: DynStone[];
  /** mark a node broken; respawnAt = null means permanent removal */
  breakNode: (id: string, respawnAt: number | null) => void;
  /** restore a regrown node */
  restore: (id: string) => void;
  addDynamic: (s: DynStone) => void;
  removeDynamic: (id: string) => void;
}

export const useNodeStateStore = create<NodeStateStore>((set) => ({
  broken: {},
  dynamic: [],
  breakNode: (id, respawnAt) =>
    set((s) => ({ broken: { ...s.broken, [id]: respawnAt ?? Number.POSITIVE_INFINITY } })),
  restore: (id) =>
    set((s) => {
      if (!(id in s.broken)) return s;
      const next = { ...s.broken };
      delete next[id];
      return { broken: next };
    }),
  addDynamic: (st) =>
    set((s) => (s.dynamic.some((d) => d.id === st.id) ? s : { dynamic: [...s.dynamic, st] })),
  removeDynamic: (id) => set((s) => ({ dynamic: s.dynamic.filter((d) => d.id !== id) })),
}));
