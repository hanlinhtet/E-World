import { create } from 'zustand';

export interface Monster {
  id: string;
  campId: string | null;
  kind: string;
  color: string;
  size: number;
  speed: number;
  attack: 'melee' | 'bow';
  damage: number;
  attackRange: number;
  aggroRange: number;
  attackCooldown: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  lootKey: string;
  lootQty: number;
  coins: number;
  nextAttackAt: number;
  flashUntil: number;
  lungeUntil: number;
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

export interface Arrow {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  bornAt: number;
}

interface MonstersState {
  monsters: Monster[];
  arrows: Arrow[];
  spawn: (m: Monster) => void;
  remove: (id: string) => void;
  addArrow: (a: Arrow) => void;
  removeArrow: (id: string) => void;
}

export const useMonstersStore = create<MonstersState>((set) => ({
  monsters: [],
  arrows: [],
  spawn: (m) => set((s) => ({ monsters: [...s.monsters, m] })),
  remove: (id) => set((s) => ({ monsters: s.monsters.filter((m) => m.id !== id) })),
  addArrow: (a) => set((s) => ({ arrows: [...s.arrows, a] })),
  removeArrow: (id) => set((s) => ({ arrows: s.arrows.filter((a) => a.id !== id) })),
}));
