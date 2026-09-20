'use client';
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useProgressStore } from '@/store/progress.store';
import { useCombatStore } from '@/store/combat.store';
import { useUiStore } from '@/store/ui.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { usePlayerStore } from '@/store/player.store';
import { useBreathsStore } from '@/store/breaths.store';
import { useExplosionsStore } from '@/store/explosions.store';
import { useTornadoesStore } from '@/store/tornadoes.store';
import { useWavesStore } from '@/store/waves.store';
import { useStormsStore } from '@/store/storms.store';
import { useBoltsStore } from '@/store/bolts.store';
import { useMonstersStore } from '@/store/monsters.store';
import { useAnimalsStore } from '@/store/animals.store';
import { useDamageStore } from '@/store/damage.store';
import { damageArea, knockArea, slowArea, stunArea } from './Projectiles';
import {
  ELEMENTS,
  ELEMENT_INFO,
  spellByElementTier,
  spellDef,
  chargeFraction,
  MAX_DMG_MULT,
  MAX_SIZE_MULT,
  ARC_GROW,
  BREATH_GROW,
} from './spells';
import { aimGroundPoint } from './aim';

let pseq = 0;

/**
 * Casting + element selection (see docs/spells/README.md):
 *   1/2/3 select the element (Fire / Water / Air — those you've learned)
 *   Right-click (hold) = that element's Skill 1
 *   Q (hold)           = Skill 2
 *   X (hold)           = Skill 3
 *   Each skill behaves by its cast type (projectile / arc / breath / self);
 *   holding charges it (bigger/stronger/longer). Left-click still gathers.
 */
export function Combat() {
  const { camera } = useThree();

  // Keep the active element to one the player actually has spells for.
  useFrame(() => {
    const learned = useProgressStore.getState().learned;
    const has = (el: string) => [1, 2, 3].some((t) => { const d = spellByElementTier(el, t); return d && learned[d.key]; });
    const active = useCombatStore.getState().activeElement;
    if (!has(active)) {
      const fallback = ELEMENTS.find(has);
      if (fallback) useCombatStore.getState().setActiveElement(fallback);
    }
  });

  useEffect(() => {
    const lastCast: Record<string, number> = {};
    let charging = false;
    const dir = new THREE.Vector3();
    const ground = new THREE.Vector3();
    const toast = (t: string) => useGameplayStore.getState().pushToast(t, performance.now());

    const beginTier = (tier: number) => {
      if (charging || useUiStore.getState().panel !== 'none') return;
      const el = useCombatStore.getState().activeElement;
      const def = spellByElementTier(el, tier);
      if (!def) return;
      if (!useProgressStore.getState().learned[def.key]) {
        toast(`${ELEMENT_INFO[el]?.icon ?? ''} ${def.name} — not learned`);
        return;
      }
      const now = performance.now();
      if (now - (lastCast[def.key] ?? 0) < def.cooldownMs) return;
      charging = true;
      useCombatStore.getState().beginCharge(def.key, now);
    };

    const release = () => {
      if (!charging) return;
      charging = false;
      const combat = useCombatStore.getState();
      const start = combat.chargeStart;
      const key = combat.chargingSpell;
      combat.endCharge();
      if (useUiStore.getState().panel !== 'none') return;
      const def = key ? spellDef(key) : undefined;
      if (!def || !start) return;
      const now = performance.now();
      lastCast[def.key] = now;
      const charge = chargeFraction(now - start);
      const dmg = Math.round(def.damage * (1 + charge * (MAX_DMG_MULT - 1)));
      camera.getWorldDirection(dir).normalize();

      if (def.castType === 'self') {
        usePlayerStore.getState().heal(40);
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'breath') {
        const len = (def.length ?? 14) * (1 + charge * BREATH_GROW);
        const flen = Math.hypot(dir.x, dir.z) || 1;
        useBreathsStore.getState().add({
          ox: camera.position.x, oz: camera.position.z,
          dx: dir.x / flen, dz: dir.z / flen,
          length: len, width: def.width ?? 6, color: def.color, damage: def.damage,
          start: now, duration: 1000, lastTick: 0,
        });
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'updraft') {
        // Targeted wind vortex: damage + fling everything (and you) skyward.
        aimGroundPoint(camera, dir, ground);
        const aoe = def.aoe ?? 4.5;
        damageArea(ground.x, ground.y + 0.5, ground.z, aoe, dmg, def.color, now);
        knockArea(ground.x, ground.y, ground.z, aoe, def.knock ?? 8, now, def.launch ?? 16);
        useExplosionsStore.getState().add(ground.x, ground.y, ground.z, aoe, def.color, now, 'vortex');
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'chain') {
        // Instant bolt to the nearest enemy in front, arcing to more nearby foes.
        camera.getWorldDirection(dir).normalize();
        const px = camera.position.x;
        const py = camera.position.y;
        const pz = camera.position.z;
        type En = { x: number; y: number; z: number; size: number; hp: number; flashUntil: number; stunUntil: number; dead: boolean; top: number };
        const list: En[] = [];
        for (const m of useMonstersStore.getState().monsters) if (!m.dead) list.push(Object.assign(m, { top: m.size * 1.7 }) as unknown as En);
        for (const a of useAnimalsStore.getState().animals) if (!a.dead) list.push(Object.assign(a, { top: a.size + 0.4 }) as unknown as En);

        const range = def.range ?? 30;
        let best: En | null = null;
        let bestScore = Infinity;
        for (const e of list) {
          const ex = e.x - px;
          const ez = e.z - pz;
          const d = Math.hypot(ex, ez);
          if (d > range) continue;
          const dot = (ex * dir.x + ez * dir.z) / (d || 1);
          if (dot < 0.2) continue;
          const score = d - dot * 8;
          if (score < bestScore) { bestScore = score; best = e; }
        }
        let prev: [number, number, number] = [px + dir.x * 0.6, py - 0.2, pz + dir.z * 0.6];
        if (!best) {
          useBoltsStore.getState().add(prev, [px + dir.x * range, py + dir.y * range, pz + dir.z * range], def.color, now);
          return;
        }
        const visited = new Set<En>();
        let cur: En | null = best;
        let d = dmg;
        const maxHits = 1 + (def.chainCount ?? 3);
        const chainR = def.chainRadius ?? 12;
        while (cur && visited.size < maxHits) {
          visited.add(cur);
          cur.hp -= Math.round(d);
          cur.flashUntil = now + 160;
          cur.stunUntil = Math.max(cur.stunUntil, now + (def.stun ?? 400));
          const hitPt: [number, number, number] = [cur.x, cur.y + cur.top, cur.z];
          useBoltsStore.getState().add(prev, hitPt, def.color, now);
          useDamageStore.getState().add(cur.x, cur.y + cur.top, cur.z, Math.round(d), false, now);
          prev = hitPt;
          d *= 0.82;
          // next: nearest unvisited within chain radius
          let next: En | null = null;
          let nd = chainR * chainR;
          for (const e of list) {
            if (visited.has(e) || e.dead) continue;
            const dd = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
            if (dd < nd) { nd = dd; next = e; }
          }
          cur = next;
        }
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'thunder') {
        // A bolt crashes from the sky onto the mark — AoE damage + stun.
        aimGroundPoint(camera, dir, ground);
        const aoe = def.aoe ?? 4;
        useBoltsStore.getState().add([ground.x, ground.y + 18, ground.z], [ground.x, ground.y + 0.3, ground.z], def.color, now);
        damageArea(ground.x, ground.y + 0.5, ground.z, aoe, dmg, def.color, now);
        stunArea(ground.x, ground.z, aoe, now + (def.stun ?? 1000));
        useExplosionsStore.getState().add(ground.x, ground.y, ground.z, aoe, def.color, now, 'blast');
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'storm') {
        aimGroundPoint(camera, dir, ground);
        useStormsStore.getState().add({
          x: ground.x, y: ground.y, z: ground.z,
          radius: def.aoe ?? 8, damage: def.damage, stun: def.stun ?? 700,
          color: def.color, start: now, duration: def.duration ?? 3200, lastStrike: 0,
        });
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'geyser') {
        // Water spout: erupts at the mark, flings foes up, soaks (slows) them.
        aimGroundPoint(camera, dir, ground);
        const aoe = def.aoe ?? 4;
        damageArea(ground.x, ground.y + 0.5, ground.z, aoe, dmg, def.color, now);
        knockArea(ground.x, ground.y, ground.z, aoe, def.knock ?? 6, now, def.launch ?? 16);
        if (def.slow) slowArea(ground.x, ground.z, aoe, now + def.slow);
        useExplosionsStore.getState().add(ground.x, ground.y, ground.z, aoe, def.color, now, 'geyser');
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'wave') {
        // Tsunami: a wall of water surges forward — hold longer = travels farther.
        const flen = Math.hypot(dir.x, dir.z) || 1;
        const length = (def.length ?? 24) * (1 + charge * BREATH_GROW);
        useWavesStore.getState().add({
          ox: camera.position.x, oz: camera.position.z,
          dx: dir.x / flen, dz: dir.z / flen,
          length, width: def.width ?? 12, speed: def.speed ?? 18,
          damage: dmg, knock: def.knock ?? 16, slow: def.slow ?? 2000, color: def.color, start: now,
        });
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'tornado') {
        // Persistent twister at the aimed spot.
        aimGroundPoint(camera, dir, ground);
        useTornadoesStore.getState().add({
          x: ground.x, y: ground.y, z: ground.z,
          radius: def.aoe ?? 5, color: def.color, damage: def.damage,
          start: now, duration: def.duration ?? 2800, lastTick: 0,
        });
        toast(`${def.icon} ${def.name}`);
        return;
      }

      if (def.castType === 'arc') {
        aimGroundPoint(camera, dir, ground);
        const aoe = (def.aoe ?? 2.6) * (1 + charge * ARC_GROW);
        useCombatStore.getState().addProjectile({
          id: `p:${now.toString(36)}-${++pseq}`,
          x: ground.x, y: ground.y + 30, z: ground.z,
          vx: 0, vy: -(def.speed ?? 40), vz: 0,
          color: def.color, radius: 0.7, visual: aoe, damage: dmg, bornAt: now,
          grav: 0, aoe, ignites: def.element === 'fire', knock: def.knock,
        });
        return;
      }

      // projectile bolt
      const size = (def.radius ?? 1) * (1 + charge * (MAX_SIZE_MULT - 1));
      useCombatStore.getState().addProjectile({
        id: `p:${now.toString(36)}-${++pseq}`,
        x: camera.position.x + dir.x * 0.9,
        y: camera.position.y + dir.y * 0.9 - 0.15,
        z: camera.position.z + dir.z * 0.9,
        vx: dir.x * def.speed!, vy: dir.y * def.speed!, vz: dir.z * def.speed!,
        color: def.color, radius: size, damage: dmg, bornAt: now,
        grow: charge * 0.9, ignites: def.element === 'fire', aoe: def.aoe, knock: def.knock, slow: def.slow, bubble: def.bubble,
      });
    };

    const cancel = () => {
      if (!charging) return;
      charging = false;
      useCombatStore.getState().endCharge();
    };

    const selectElement = (el: string) => {
      const learned = useProgressStore.getState().learned;
      const has = [1, 2, 3].some((t) => { const d = spellByElementTier(el, t); return d && learned[d.key]; });
      if (!has) {
        toast(`${ELEMENT_INFO[el]?.icon ?? ''} ${ELEMENT_INFO[el]?.name ?? el} — none learned`);
        return;
      }
      useCombatStore.getState().setActiveElement(el);
      toast(`${ELEMENT_INFO[el]?.icon ?? ''} ${ELEMENT_INFO[el]?.name ?? el}`);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        const ui = useUiStore.getState();
        if (ui.panel === 'none' && ui.nearNpcId) ui.open('shop', ui.nearNpcId);
      } else if (e.code === 'KeyQ') beginTier(2);
      else if (e.code === 'KeyX') beginTier(3);
      else if (e.code === 'KeyF') beginTier(1);
      else if (e.code === 'Escape') cancel();
      else if (/^Digit[1-4]$/.test(e.code)) selectElement(ELEMENTS[Number(e.code.slice(5)) - 1]!);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ' || e.code === 'KeyX' || e.code === 'KeyF') release();
    };
    const onMouse = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        beginTier(1);
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) release();
    };
    const onCtx = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouse);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onCtx);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouse);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onCtx);
    };
  }, [camera]);

  return null;
}
