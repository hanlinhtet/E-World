import { create } from 'zustand';

export interface Camp {
  id: string;
  x: number;
  z: number;
}

export interface ChestLoot {
  key: string;
  qty: number;
}

export interface Chest {
  id: string;
  x: number;
  y: number;
  z: number;
  gold: number;
  items: ChestLoot[];
  opened: boolean;
}

interface CampsState {
  camps: Camp[];
  chests: Chest[];
  addCamp: (c: Camp) => void;
  removeCamp: (id: string) => void;
  addChest: (c: Chest) => void;
  openChest: (id: string) => void;
}

export const useCampsStore = create<CampsState>((set) => ({
  camps: [],
  chests: [],
  addCamp: (c) => set((s) => ({ camps: [...s.camps, c] })),
  removeCamp: (id) => set((s) => ({ camps: s.camps.filter((c) => c.id !== id) })),
  addChest: (c) => set((s) => ({ chests: [...s.chests, c] })),
  openChest: (id) => set((s) => ({ chests: s.chests.map((c) => (c.id === id ? { ...c, opened: true } : c)) })),
}));
