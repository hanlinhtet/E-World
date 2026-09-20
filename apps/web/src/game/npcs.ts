export type NpcKind = 'spellmaster' | 'trainer' | 'merchant';

export interface Offering {
  key: string;
  name: string;
  icon: string;
  cost: number; // coins
  type: 'spell' | 'skill';
  desc: string;
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  kind: NpcKind;
  color: string; // robe color
  /** world position (y is sampled from the surface at runtime) */
  x: number;
  z: number;
  offers: Offering[];
}

/**
 * A small starting "village" of NPCs near spawn. Spell masters and trainers
 * sell spells/skills for coins; the merchant buys your gathered resources.
 */
export const NPCS: NpcDef[] = [
  {
    id: 'pyra',
    name: 'Pyra',
    title: 'Fire Mage',
    kind: 'spellmaster',
    color: '#b6442f',
    x: 16,
    z: -12,
    offers: [
      { key: 'fireball', name: 'Fireball', icon: '🔥', cost: 40, type: 'spell', desc: 'Skill 1 · Hold RMB to charge & throw.' },
      { key: 'meteor_arc', name: 'Meteor Arc', icon: '☄️', cost: 90, type: 'spell', desc: 'Skill 2 (Q) · Lob to a marked spot, explodes.' },
      { key: 'dragon_breath', name: "Dragon's Breath", icon: '🐉', cost: 170, type: 'spell', desc: 'Skill 3 (X) · Rain flame over an area ahead.' },
    ],
  },
  {
    id: 'nereus',
    name: 'Nereus',
    title: 'Water Sage',
    kind: 'spellmaster',
    color: '#2f6db6',
    x: -18,
    z: 14,
    offers: [
      { key: 'water_beam', name: 'Water Beam', icon: '💧', cost: 40, type: 'spell', desc: 'Skill 1 · A fast jet of water that soaks (slows).' },
      { key: 'geyser', name: 'Geyser', icon: '⛲', cost: 110, type: 'spell', desc: 'Skill 2 (Q) · A water spout erupts, flinging foes up.' },
      { key: 'tsunami', name: 'Tsunami', icon: '🌊', cost: 200, type: 'spell', desc: 'Skill 3 (X) · A surging wave sweeps everything away.' },
    ],
  },
  {
    id: 'zephyr',
    name: 'Zephyr',
    title: 'Air Wizard',
    kind: 'spellmaster',
    color: '#5aa0c8',
    x: 22,
    z: 10,
    offers: [
      { key: 'air_bomb', name: 'Air Bomb', icon: '🌀', cost: 50, type: 'spell', desc: 'Skill 1 · Blast that knocks back — even launches you!' },
      { key: 'updraft', name: 'Updraft', icon: '🌬️', cost: 110, type: 'spell', desc: 'Skill 2 (Q) · Wind vortex that flings foes skyward.' },
      { key: 'tornado', name: 'Tornado', icon: '🌪️', cost: 200, type: 'spell', desc: 'Skill 3 (X) · A twister that pulls in and shreds.' },
    ],
  },
  {
    id: 'storm',
    name: 'Voltaire',
    title: 'Storm Mage',
    kind: 'spellmaster',
    color: '#6b5ea8',
    x: -22,
    z: -10,
    offers: [
      { key: 'chain_lightning', name: 'Chain Lightning', icon: '⚡', cost: 60, type: 'spell', desc: 'Skill 1 · A bolt that arcs between many foes.' },
      { key: 'thunder_strike', name: 'Thunder Strike', icon: '🌩️', cost: 120, type: 'spell', desc: 'Skill 2 (Q) · Call a bolt from the sky — stuns.' },
      { key: 'lightning_storm', name: 'Lightning Storm', icon: '⛈️', cost: 220, type: 'spell', desc: 'Skill 3 (X) · A storm rains bolts on an area.' },
    ],
  },
  {
    id: 'bolt',
    name: 'Bolt',
    title: 'Movement Trainer',
    kind: 'trainer',
    color: '#8a7a2f',
    x: 6,
    z: 20,
    offers: [
      { key: 'dash', name: 'Dash', icon: '💨', cost: 60, type: 'skill', desc: 'A quick burst of speed.' },
      { key: 'double_jump', name: 'Double Jump', icon: '⏫', cost: 90, type: 'skill', desc: 'Jump again in mid-air.' },
      { key: 'glide', name: 'Glide', icon: '🪂', cost: 120, type: 'skill', desc: 'Glide gently through the air.' },
    ],
  },
  {
    id: 'gilda',
    name: 'Gilda',
    title: 'Merchant',
    kind: 'merchant',
    color: '#3f7a4a',
    x: -6,
    z: -20,
    offers: [],
  },
];

export function npcById(id: string): NpcDef | undefined {
  return NPCS.find((n) => n.id === id);
}
