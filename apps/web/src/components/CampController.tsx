'use client';
import { useEffect } from 'react';
import { surfaceHeight } from '@eworld/game-core';
import { useCampfiresStore, nextCampfireId } from '@/store/campfires.store';
import { useInventoryStore } from '@/store/inventory.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { usePlayerStore } from '@/store/player.store';
import { useUiStore } from '@/store/ui.store';
import { FOOD_HEAL } from '@/game/items';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const NEAR = 3.6;
const COOK_MS = 4000;

/**
 * Survival camp controls:
 *   B — build a campfire (3 wood + 6 stone) in front of you
 *   C — when near a campfire: light it (2 stone) if unlit, else cook raw meat
 *   G — eat cooked meat to heal
 * (A fireball striking an unlit campfire also lights it — see Projectiles.)
 */
export function CampController() {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = usePlayerStore.getState().position;
      const fires = useCampfiresStore.getState().campfires;
      let best: string | null = null;
      let bd = NEAR * NEAR;
      for (const c of fires) {
        const d2 = (c.x - p.x) ** 2 + (c.z - p.z) ** 2;
        if (d2 < bd) {
          bd = d2;
          best = c.id;
        }
      }
      useCampfiresStore.getState().setNear(best);
    };
    raf = requestAnimationFrame(tick);

    const toast = (t: string) => useGameplayStore.getState().pushToast(t, performance.now());
    const onKey = (e: KeyboardEvent) => {
      if (useUiStore.getState().panel !== 'none') return;
      const inv = useInventoryStore.getState();

      if (e.code === 'KeyB') {
        if (inv.has('wood', 3) && inv.has('stone', 6)) {
          inv.remove('wood', 3);
          inv.remove('stone', 6);
          const p = usePlayerStore.getState().position;
          const yaw = usePlayerStore.getState().look.yaw;
          const x = p.x + Math.sin(yaw) * 3;
          const z = p.z + Math.cos(yaw) * 3;
          useCampfiresStore.getState().place({ id: nextCampfireId(), x, y: surfaceHeight(SEED, x, z), z, lit: false, cookingUntil: 0 });
          toast('🪵 Campfire placed — light it (C or a fireball)');
        } else {
          toast('Need 3 🪵 + 6 🪨 to build a campfire');
        }
      } else if (e.code === 'KeyC') {
        const id = useCampfiresStore.getState().nearId;
        const fire = id ? useCampfiresStore.getState().campfires.find((c) => c.id === id) : undefined;
        if (!fire) return;
        if (!fire.lit) {
          if (inv.has('stone', 2)) {
            inv.remove('stone', 2);
            useCampfiresStore.getState().update(fire.id, { lit: true });
            toast('🔥 Campfire lit');
          } else {
            toast('Need 2 🪨 to spark it (or hit it with a fireball)');
          }
        } else if (fire.cookingUntil) {
          toast('🍖 Already cooking…');
        } else if (inv.has('meat', 1)) {
          inv.remove('meat', 1);
          useCampfiresStore.getState().update(fire.id, { cookingUntil: performance.now() + COOK_MS });
          toast('🍖 Cooking raw meat…');
        } else {
          toast('No raw meat to cook');
        }
      } else if (e.code === 'KeyG') {
        if (inv.has('cooked_meat', 1)) {
          inv.remove('cooked_meat', 1);
          const heal = FOOD_HEAL.cooked_meat ?? 35;
          usePlayerStore.getState().heal(heal);
          toast(`🍗 Ate Cooked Meat · +${heal} HP`);
        } else {
          toast('No cooked meat — cook some at a campfire');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
