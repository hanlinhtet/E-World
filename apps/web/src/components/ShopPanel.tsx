'use client';
import { useUiStore } from '@/store/ui.store';
import { useProgressStore } from '@/store/progress.store';
import { useInventoryStore } from '@/store/inventory.store';
import { npcById } from '@/game/npcs';
import { itemMeta, SELL_VALUE } from '@/game/items';

/** NPC shop: buy spells/skills with coins, and sell gathered resources. */
export function ShopPanel() {
  const npcId = useUiStore((s) => s.activeNpcId);
  const coins = useProgressStore((s) => s.coins);
  const learned = useProgressStore((s) => s.learned);
  const items = useInventoryStore((s) => s.items);
  const npc = npcId ? npcById(npcId) : undefined;
  if (!npc) return null;

  const buy = (key: string, cost: number) => {
    const prog = useProgressStore.getState();
    if (prog.hasLearned(key) || !prog.spend(cost)) return;
    prog.learn(key);
  };

  const sell = (key: string) => {
    const inv = useInventoryStore.getState();
    if (!inv.remove(key, 1)) return;
    useProgressStore.getState().addCoins(SELL_VALUE[key] ?? 1);
  };

  const sellable = Object.entries(items).filter(([k, q]) => q > 0 && SELL_VALUE[k] != null);

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60">
      <div className="glass w-[min(94vw,560px)] rounded-3xl p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{npc.name}</h2>
            <p className="text-xs text-white/50">{npc.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-300/20 px-3 py-1 text-sm font-semibold text-amber-200">
              {coins} 🪙
            </span>
            <button
              onClick={() => useUiStore.getState().close()}
              className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
            >
              Close ✕
            </button>
          </div>
        </div>

        {npc.offers.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-semibold text-white/80">
              {npc.kind === 'trainer' ? 'Skills' : 'Spells'}
            </h3>
            <div className="mb-5 flex flex-col gap-2">
              {npc.offers.map((o) => {
                const owned = !!learned[o.key];
                const afford = coins >= o.cost;
                return (
                  <div key={o.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{o.icon}</span>
                      <div>
                        <div className="text-sm font-medium">{o.name}</div>
                        <div className="text-xs text-white/50">{o.desc}</div>
                      </div>
                    </div>
                    <button
                      disabled={owned || !afford}
                      onClick={() => buy(o.key, o.cost)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        owned
                          ? 'bg-emerald-500/30 text-emerald-200'
                          : afford
                            ? 'bg-amber-300/90 text-black hover:bg-amber-200'
                            : 'cursor-not-allowed bg-white/10 text-white/40'
                      }`}
                    >
                      {owned ? 'Learned ✓' : `${o.cost} 🪙`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Sell section (available at every NPC) */}
        <h3 className="mb-2 text-sm font-semibold text-white/80">Sell Resources</h3>
        {sellable.length === 0 ? (
          <p className="text-xs text-white/40">Nothing to sell — go gather some resources.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sellable.map(([k, q]) => (
              <button
                key={k}
                onClick={() => sell(k)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                <span className="text-xl">{itemMeta(k).icon}</span>
                <span>{q}</span>
                <span className="text-xs text-amber-200">+{SELL_VALUE[k]}🪙</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
