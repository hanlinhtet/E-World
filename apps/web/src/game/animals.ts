/** Passive animal species. They wander and flee when hit — they never attack. */
export interface AnimalKind {
  key: string;
  name: string;
  icon: string;
  bodyColor: string;
  /** body half-height-ish scale */
  size: number;
  speed: number; // m/s wander
  hp: number;
  lootKey: string;
  lootQty: number;
}

export const ANIMAL_KINDS: AnimalKind[] = [
  { key: 'rabbit', name: 'Rabbit', icon: '🐇', bodyColor: '#c8b9a6', size: 0.32, speed: 3.2, hp: 20, lootKey: 'hide', lootQty: 1 },
  { key: 'deer', name: 'Deer', icon: '🦌', bodyColor: '#9c6b3f', size: 0.7, speed: 3.0, hp: 50, lootKey: 'hide', lootQty: 2 },
  { key: 'boar', name: 'Boar', icon: '🐗', bodyColor: '#5b4636', size: 0.6, speed: 2.4, hp: 70, lootKey: 'meat', lootQty: 2 },
];

export function randomAnimalKind(): AnimalKind {
  return ANIMAL_KINDS[Math.floor(Math.random() * ANIMAL_KINDS.length)]!;
}
