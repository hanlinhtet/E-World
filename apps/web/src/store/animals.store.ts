import { create } from 'zustand';

/** A live animal. Position/AI fields are MUTATED in place each frame (no React
 *  churn); the array identity only changes on spawn/despawn. */
export interface Animal {
  id: string;
  kind: string;
  color: string;
  size: number;
  speed: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  lootKey: string;
  lootQty: number;
  targetX: number;
  targetZ: number;
  fleeUntil: number;
  flashUntil: number;
  knockX: number;
  knockZ: number;
  knockVY: number;
  knockUntil: number;
  slowUntil: number;
  bubbleUntil: number;
  bubbleNextTick: number;
  stunUntil: number;
  dead: boolean;
}

interface AnimalsState {
  animals: Animal[];
  spawn: (a: Animal) => void;
  remove: (id: string) => void;
}

export const useAnimalsStore = create<AnimalsState>((set) => ({
  animals: [],
  spawn: (a) => set((s) => ({ animals: [...s.animals, a] })),
  remove: (id) => set((s) => ({ animals: s.animals.filter((a) => a.id !== id) })),
}));
