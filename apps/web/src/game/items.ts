/** Client-side item display catalog (name + emoji icon). The server's
 *  ItemDefinition table is the source of truth; this is just for HUD/crafting
 *  rendering until inventory is synced from the backend. */
export interface ItemMeta {
  name: string;
  icon: string;
}

export const ITEM_META: Record<string, ItemMeta> = {
  // gathered
  wood: { name: 'Wood', icon: '🪵' },
  stone: { name: 'Stone', icon: '🪨' },
  fiber: { name: 'Fiber', icon: '🌿' },
  // crafted
  plank: { name: 'Plank', icon: '🟫' },
  stone_axe: { name: 'Stone Axe', icon: '🪓' },
  campfire: { name: 'Campfire', icon: '🔥' },
  rope: { name: 'Rope', icon: '🪢' },
  torch: { name: 'Torch', icon: '🔦' },
  // animal / monster loot
  hide: { name: 'Hide', icon: '🟤' },
  meat: { name: 'Raw Meat', icon: '🍖' },
  cooked_meat: { name: 'Cooked Meat', icon: '🍗' },
  bone: { name: 'Bone', icon: '🦴' },
};

/** Food items restore this much HP when eaten. */
export const FOOD_HEAL: Record<string, number> = {
  cooked_meat: 35,
  meat: 6, // raw meat is barely edible — cook it!
};

export function itemMeta(key: string): ItemMeta {
  return ITEM_META[key] ?? { name: key, icon: '📦' };
}

/** Sell value of gathered resources (coins each) at a merchant. */
export const SELL_VALUE: Record<string, number> = {
  wood: 1,
  stone: 2,
  fiber: 1,
  plank: 3,
  hide: 4,
  meat: 3,
  cooked_meat: 6,
  bone: 2,
};
