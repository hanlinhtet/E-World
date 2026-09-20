'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useWorldStore } from '@/store/world.store';
import { useInventoryStore } from '@/store/inventory.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { useUiStore } from '@/store/ui.store';
import { useProgressStore } from '@/store/progress.store';
import { useCombatStore } from '@/store/combat.store';
import { usePlayerStore } from '@/store/player.store';
import { useCampfiresStore } from '@/store/campfires.store';
import { itemMeta } from '@/game/items';
import { npcById } from '@/game/npcs';
import { spellByElementTier, ELEMENTS, ELEMENT_INFO } from '@/game/spells';
import { Minimap } from './Minimap';
import { ChargeBar } from './ChargeBar';
import { HurtFlash } from './HurtFlash';
import { HitIndicators } from './HitIndicators';
import { CampController } from './CampController';
import { UiController } from './UiController';
import { WorldMap } from './WorldMap';
import { InventoryPanel } from './InventoryPanel';
import { ShopPanel } from './ShopPanel';

const HOTBAR_SLOTS = 8;

const MOVEMENT_SKILLS = [
  { key: 'dash', name: 'Dash', icon: '💨', hint: '2× W/A/S/D' },
  { key: 'double_jump', name: 'Double Jump', icon: '⏫', hint: '2× Space' },
  { key: 'glide', name: 'Glide', icon: '🪂', hint: 'Hold Space' },
];

export function Hud() {
  const profile = useAuthStore((s) => s.profile);
  const phase = useWorldStore((s) => s.sky.phase);
  const items = useInventoryStore((s) => s.items);
  const target = useGameplayStore((s) => s.target);
  const toasts = useGameplayStore((s) => s.toasts);
  const panel = useUiStore((s) => s.panel);
  const nearNpcId = useUiStore((s) => s.nearNpcId);
  const coins = useProgressStore((s) => s.coins);
  const learned = useProgressStore((s) => s.learned);
  const activeElement = useCombatStore((s) => s.activeElement);
  const elementLearned = (el: string) => [1, 2, 3].some((t) => { const d = spellByElementTier(el, t); return d && learned[d.key]; });
  const learnedElements = ELEMENTS.filter(elementLearned);
  const activeSkills = [1, 2, 3].map((t) => spellByElementTier(activeElement, t));
  const health = usePlayerStore((s) => s.health);
  const maxHealth = usePlayerStore((s) => s.maxHealth);
  const nearCampId = useCampfiresStore((s) => s.nearId);
  const campfires = useCampfiresStore((s) => s.campfires);
  const nearFire = nearCampId ? campfires.find((c) => c.id === nearCampId) : undefined;
  const [clock, setClock] = useState('');

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  // Defeat → revive (in place) with a brief invulnerability.
  useEffect(() => {
    if (health <= 0) {
      usePlayerStore.getState().revive(performance.now());
      useGameplayStore.getState().pushToast('💀 You were defeated — revived!', performance.now());
    }
  }, [health]);

  const entries = Object.entries(items).filter(([, q]) => q > 0);
  const slots = Array.from({ length: HOTBAR_SLOTS }, (_, i) => entries[i] ?? null);
  const open = panel !== 'none';
  const nearNpc = nearNpcId ? npcById(nearNpcId) : undefined;

  return (
    <>
      <div className={`${open ? '' : 'crosshair'} pointer-events-none fixed inset-0`}>
        {/* Identity + coins */}
        <div className="glass pointer-events-auto absolute left-4 top-4 rounded-2xl px-4 py-3">
          <div className="text-sm font-semibold">{profile?.username ?? 'Traveler'}</div>
          <div className="text-xs text-white/60">
            Lv {profile?.level ?? 1} · <span className="text-amber-200">{coins} 🪙</span>
          </div>
        </div>

        {/* Learned movement skills + how to use them */}
        {MOVEMENT_SKILLS.some((m) => learned[m.key]) && (
          <div className="glass absolute left-4 top-[88px] rounded-2xl px-3 py-2">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Abilities</div>
            <div className="flex flex-col gap-1">
              {MOVEMENT_SKILLS.filter((m) => learned[m.key]).map((m) => (
                <div key={m.key} className="flex items-center gap-2 text-xs">
                  <span className="text-base">{m.icon}</span>
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-auto text-[10px] text-white/45">{m.hint}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time / phase + hotkeys */}
        <div className="glass absolute right-4 top-4 rounded-2xl px-4 py-3 text-right">
          <div className="text-sm font-semibold capitalize">{phase.toLowerCase()}</div>
          <div className="text-xs text-white/60">{clock}</div>
          <div className="mt-1 text-[10px] text-white/40">M Map · I Bag · E Talk · RMB Cast · B Camp · C Use · G Eat</div>
        </div>

        {/* Element selector + the active element's 3 skills */}
        {!open && (
          <div className="absolute bottom-5 right-4 flex flex-col items-end gap-1.5">
            {learnedElements.length === 0 ? (
              <div className="glass rounded-xl px-3 py-2 text-[11px] text-white/40">No spells — visit a mage</div>
            ) : (
              <>
                {/* element chips (number keys) */}
                <div className="flex gap-1.5">
                  {ELEMENTS.map((el, i) => {
                    const owned = elementLearned(el);
                    const active = el === activeElement;
                    const info = ELEMENT_INFO[el]!;
                    return (
                      <div
                        key={el}
                        className={`glass relative flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${
                          active ? 'border-amber-300 ring-2 ring-amber-300/60' : 'border-white/15'
                        } ${owned ? '' : 'opacity-30'}`}
                        title={info.name}
                      >
                        {info.icon}
                        <span className="absolute left-0.5 top-0 text-[8px] text-white/50">{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
                {/* the 3 skills of the active element */}
                <div className="flex gap-1.5">
                  {activeSkills.map((sp, i) => {
                    const owned = sp && learned[sp.key];
                    const keyLabel = ['RMB', 'Q', 'X'][i];
                    return (
                      <div
                        key={i}
                        className={`glass flex h-12 w-12 flex-col items-center justify-center rounded-lg border ${
                          owned ? 'border-white/25' : 'border-white/10 opacity-35'
                        }`}
                        title={sp?.name ?? ''}
                      >
                        <span className="text-xl leading-none">{sp?.icon ?? '—'}</span>
                        <span className="text-[8px] text-white/50">{keyLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-white/50">1-3 element · RMB/Q/X = skill 1/2/3 (hold to charge)</div>
              </>
            )}
          </div>
        )}

        {/* Pickup toasts */}
        {!open && (
          <div className="absolute left-1/2 top-[40%] flex -translate-x-1/2 flex-col items-center gap-1">
            {toasts.map((t) => (
              <div key={t.id} className="glass rounded-full px-3 py-1 text-sm font-medium text-emerald-200">
                {t.text}
              </div>
            ))}
          </div>
        )}

        {/* Crosshair target */}
        {!open && target && (
          <div className="absolute left-1/2 top-[calc(50%+18px)] -translate-x-1/2 text-center">
            <div className="text-xs font-medium text-white/80 drop-shadow">{target.label}</div>
            {target.progress > 0 && (
              <div className="mx-auto mt-1 h-1 w-20 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-amber-300 transition-[width] duration-100" style={{ width: `${Math.min(100, target.progress * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {/* NPC talk prompt */}
        {!open && nearNpc && (
          <div className="absolute left-1/2 top-[58%] -translate-x-1/2">
            <div className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
              <kbd className="rounded bg-white/20 px-2 py-0.5 text-xs font-bold">E</kbd>
              <span>Talk to {nearNpc.name} · {nearNpc.title}</span>
            </div>
          </div>
        )}

        {/* Campfire prompt */}
        {!open && nearFire && (
          <div className="absolute left-1/2 top-[62%] -translate-x-1/2">
            <div className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
              <kbd className="rounded bg-white/20 px-2 py-0.5 text-xs font-bold">C</kbd>
              <span>
                {!nearFire.lit
                  ? 'Light campfire (2 🪨)'
                  : nearFire.cookingUntil
                    ? 'Cooking…'
                    : 'Cook Raw Meat 🍖'}
              </span>
            </div>
          </div>
        )}

        {/* Vitals */}
        <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 gap-3">
          <Vital label="HP" value={Math.round((health / maxHealth) * 100)} color="bg-rose-400" />
          <Vital label="ST" value={100} color="bg-emerald-400" />
          <Vital label="MP" value={100} color="bg-sky-400" />
        </div>

        {/* Hotbar */}
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slots.map((slot, i) => (
            <div key={i} className="glass flex h-14 w-14 flex-col items-center justify-center rounded-lg border border-white/15">
              {slot && (
                <>
                  <span className="text-2xl leading-none">{itemMeta(slot[0]).icon}</span>
                  <span className="mt-0.5 text-[11px] font-semibold text-white/90">{slot[1]}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {!open && <ChargeBar />}
        {!open && <HitIndicators />}
        <HurtFlash />

        <Minimap />
      </div>

      {/* Full-screen panels */}
      <UiController />
      <CampController />
      {panel === 'map' && <WorldMap />}
      {panel === 'inventory' && <InventoryPanel />}
      {panel === 'shop' && <ShopPanel />}
    </>
  );
}

function Vital({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5">
      <span className="text-[10px] text-white/60">{label}</span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
