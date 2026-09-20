import { create } from 'zustand';

export interface Campfire {
  id: string;
  x: number;
  y: number;
  z: number;
  lit: boolean;
  /** ms timestamp cooking completes (0 = not cooking) */
  cookingUntil: number;
}

interface CampfiresState {
  campfires: Campfire[];
  nearId: string | null;
  place: (c: Campfire) => void;
  update: (id: string, patch: Partial<Campfire>) => void;
  setNear: (id: string | null) => void;
}

let seq = 0;
export const nextCampfireId = () => `cf:${Date.now().toString(36)}-${++seq}`;

export const useCampfiresStore = create<CampfiresState>((set) => ({
  campfires: [],
  nearId: null,
  place: (c) => set((s) => ({ campfires: [...s.campfires, c] })),
  update: (id, patch) =>
    set((s) => ({ campfires: s.campfires.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  setNear: (id) => set((s) => (s.nearId === id ? s : { nearId: id })),
}));
