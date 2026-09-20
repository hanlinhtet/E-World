'use client';
import { useInventoryStore } from '@/store/inventory.store';
import { useUiStore } from '@/store/ui.store';
import { usePlayerStore } from '@/store/player.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { itemMeta, FOOD_HEAL } from '@/game/items';
import { RECIPES } from '@/game/crafting';

/** Inventory grid + crafting list (press I). */
export function InventoryPanel() {
  const items = useInventoryStore((s) => s.items);
  const entries = Object.entries(items).filter(([, q]) => q > 0);

  const craft = (recipeKey: string) => {
    const recipe = RECIPES.find((r) => r.key === recipeKey);
    if (!recipe) return;
    const inv = useInventoryStore.getState();
    if (!recipe.cost.every((c) => inv.has(c.key, c.qty))) return;
    recipe.cost.forEach((c) => inv.remove(c.key, c.qty));
    inv.add(recipe.outputKey, recipe.outputQty);
  };

  const canCraft = (recipeKey: string) => {
    const recipe = RECIPES.find((r) => r.key === recipeKey)!;
    return recipe.cost.every((c) => (items[c.key] ?? 0) >= c.qty);
  };

  const eat = (key: string) => {
    const heal = FOOD_HEAL[key];
    if (heal == null) return;
    if (!useInventoryStore.getState().remove(key, 1)) return;
    usePlayerStore.getState().heal(heal);
    useGameplayStore.getState().pushToast(`${itemMeta(key).icon} +${heal} HP`, performance.now());
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60">
      <div className="glass flex w-[min(94vw,860px)] gap-6 rounded-3xl p-6">
        {/* Inventory */}
        <div className="flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Inventory</h2>
            <button
              onClick={() => useUiStore.getState().close()}
              className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
            >
              Close ✕
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }).map((_, i) => {
              const e = entries[i];
              const edible = e ? FOOD_HEAL[e[0]] != null : false;
              return (
                <div
                  key={i}
                  onClick={() => e && edible && eat(e[0])}
                  title={edible ? `Click to eat (+${FOOD_HEAL[e![0]]} HP)` : undefined}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border bg-white/5 ${
                    edible ? 'cursor-pointer border-emerald-400/50 hover:bg-emerald-400/10' : 'border-white/10'
                  }`}
                >
                  {e && (
                    <>
                      <span className="text-2xl">{itemMeta(e[0]).icon}</span>
                      <span className="text-[11px] font-semibold text-white/90">{e[1]}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Crafting */}
        <div className="w-72">
          <h2 className="mb-3 text-lg font-semibold">Crafting</h2>
          <div className="flex flex-col gap-2">
            {RECIPES.map((r) => {
              const ok = canCraft(r.key);
              return (
                <div key={r.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-xl">{itemMeta(r.outputKey).icon}</span>
                      {itemMeta(r.outputKey).name} ×{r.outputQty}
                    </span>
                    <button
                      disabled={!ok}
                      onClick={() => craft(r.key)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        ok ? 'bg-emerald-400/90 text-black hover:bg-emerald-300' : 'cursor-not-allowed bg-white/10 text-white/40'
                      }`}
                    >
                      Craft
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {r.cost.map((c) => `${itemMeta(c.key).icon}${c.qty}`).join('  ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
