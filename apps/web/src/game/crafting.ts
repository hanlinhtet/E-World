export interface RecipeCost {
  key: string;
  qty: number;
}

export interface Recipe {
  key: string;
  outputKey: string;
  outputQty: number;
  cost: RecipeCost[];
}

/** Client-side crafting recipes for the gathering loop. Mirrors the server's
 *  CraftingRecipe table; will be sourced from it once inventory syncs. */
export const RECIPES: Recipe[] = [
  { key: 'plank', outputKey: 'plank', outputQty: 2, cost: [{ key: 'wood', qty: 1 }] },
  { key: 'rope', outputKey: 'rope', outputQty: 1, cost: [{ key: 'fiber', qty: 4 }] },
  { key: 'torch', outputKey: 'torch', outputQty: 2, cost: [{ key: 'wood', qty: 1 }, { key: 'fiber', qty: 1 }] },
  { key: 'stone_axe', outputKey: 'stone_axe', outputQty: 1, cost: [{ key: 'wood', qty: 3 }, { key: 'stone', qty: 2 }] },
  { key: 'campfire', outputKey: 'campfire', outputQty: 1, cost: [{ key: 'wood', qty: 5 }, { key: 'stone', qty: 3 }] },
];
