/** Hostile monsters. Unlike animals they attack the player when in aggro range,
 *  and give up (disengage) when the player escapes past the leash range. */
export interface MonsterKind {
  key: string;
  name: string;
  icon: string;
  color: string;
  size: number;
  speed: number;
  hp: number;
  attack: 'melee' | 'bow';
  damage: number;
  attackRange: number; // distance at which it can hit/shoot
  aggroRange: number; // distance at which it starts chasing
  attackCooldown: number; // ms between attacks
  lootKey: string;
  lootQty: number;
  coins: number;
}

export const MONSTER_KINDS: MonsterKind[] = [
  {
    key: 'goblin', name: 'Goblin', icon: '👺', color: '#5b7a3a', size: 0.55, speed: 3.6,
    hp: 60, attack: 'melee', damage: 9, attackRange: 2.0, aggroRange: 15, attackCooldown: 900,
    lootKey: 'hide', lootQty: 1, coins: 6,
  },
  {
    key: 'skeleton_archer', name: 'Skeleton Archer', icon: '💀', color: '#d8d2c0', size: 0.6, speed: 2.8,
    hp: 45, attack: 'bow', damage: 7, attackRange: 20, aggroRange: 24, attackCooldown: 1600,
    lootKey: 'bone', lootQty: 2, coins: 8,
  },
];

export function randomMonsterKind(): MonsterKind {
  return MONSTER_KINDS[Math.floor(Math.random() * MONSTER_KINDS.length)]!;
}
