'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { harvestablesNear, sampleTerrain, type HarvestNode } from '@eworld/game-core';
import { useGameplayStore } from '@/store/gameplay.store';
import { useInventoryStore } from '@/store/inventory.store';
import { useNodeStateStore } from '@/store/nodeState.store';
import { useEffectsStore } from '@/store/effects.store';
import { useUiStore } from '@/store/ui.store';
import { itemMeta } from './items';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const REACH = 5.5;
const SWING_MS: Record<string, number> = { chop: 420, mine: 480, hit: 300 };
const REGROW_TREE = 60_000;
const REGROW_BUSH = 30_000;
const BURST_COLOR: Record<string, string> = {
  tree: '#8a5a2b',
  rock: '#b9bcc2',
  stone: '#b9bcc2',
  bush: '#5a9e3a',
};

let dynSeq = 0;

/** Spawn a replacement stone somewhere far from the player (out of view). */
function spawnStoneOutOfView(px: number, pz: number): void {
  const add = useNodeStateStore.getState().addDynamic;
  for (let i = 0; i < 8; i++) {
    const ang = (i * 2.399963) + px; // varied per attempt without Math.random in core
    const r = 60 + ((i * 13) % 50);
    const x = px + Math.cos(ang) * r;
    const z = pz + Math.sin(ang) * r;
    const s = sampleTerrain(SEED, x, z);
    if (s.height > 0.6) {
      // timestamp keeps the id unique even across hot-reloads (which reset dynSeq)
      add({ id: `d:${Date.now().toString(36)}-${++dynSeq}`, x, z, y: s.height, scale: 0.32 + ((i * 7) % 5) / 12 });
      return;
    }
  }
}

/**
 * Gathering loop. Targets whatever the crosshair (camera-forward ray) is on
 * within reach, using ray-vs-sphere against each node. Left-click swings the
 * appropriate tool action; nodes have HP (big trees take more hits). Trees and
 * bushes regrow after a delay (leaving a stump meanwhile); stones are removed
 * for good but a replacement stone spawns off-screen.
 */
export function Interaction() {
  const { camera } = useThree();
  const fwd = useRef(new THREE.Vector3());
  const toNode = useRef(new THREE.Vector3());
  const hits = useRef<Map<string, number>>(new Map());
  const target = useRef<HarvestNode | null>(null);

  useFrame(() => {
    const now = performance.now();
    useGameplayStore.getState().expireToasts(now);
    useEffectsStore.getState().prune(now);

    camera.getWorldDirection(fwd.current).normalize();
    const px = camera.position.x;
    const py = camera.position.y;
    const pz = camera.position.z;
    const broken = useNodeStateStore.getState().broken;
    const dynamic = useNodeStateStore.getState().dynamic;

    const nodes = harvestablesNear(SEED, px, pz);
    let best: HarvestNode | null = null;
    let bestT = Infinity;

    const consider = (n: HarvestNode) => {
      if (broken[n.id]) return;
      toNode.current.set(n.wx - px, n.cy - py, n.wz - pz);
      const t = toNode.current.dot(fwd.current);
      if (t < 0.2 || t > REACH) return;
      // perpendicular distance from the aim ray to the node center
      const perp = Math.sqrt(Math.max(0, toNode.current.lengthSq() - t * t));
      if (perp > n.aimR) return; // crosshair not on it
      if (t < bestT) {
        bestT = t;
        best = n;
      }
    };

    for (let i = 0; i < nodes.length; i++) consider(nodes[i]!);
    // dynamic stones are harvestable too
    for (let i = 0; i < dynamic.length; i++) {
      const d = dynamic[i]!;
      consider({
        id: d.id, kind: 'stone', action: 'mine', wx: d.x, wz: d.z, y: d.y,
        cy: d.y + d.scale * 0.5, aimR: Math.max(d.scale, 0.6), hp: 1,
        label: 'Stone', yieldKey: 'stone', yieldQty: 1,
      });
    }

    target.current = best;
    const b = best as HarvestNode | null;
    if (b) {
      const hp = b.hp;
      const got = hits.current.get(b.id) ?? 0;
      useGameplayStore.getState().setTarget({ id: b.id, label: b.label, yieldKey: b.yieldKey, progress: got / hp });
    } else {
      useGameplayStore.getState().setTarget(null);
    }
  });

  useEffect(() => {
    const hit = () => {
      const t = target.current;
      if (!t) return;
      const now = performance.now();
      const ns = useNodeStateStore.getState();
      if (ns.broken[t.id]) return;

      useGameplayStore.getState().triggerSwing(t.action, SWING_MS[t.action] ?? 400, now);
      useEffectsStore.getState().spawnBurst(t.wx, t.cy, t.wz, BURST_COLOR[t.kind] ?? '#ffffff', now);

      const got = (hits.current.get(t.id) ?? 0) + 1;
      hits.current.set(t.id, got);
      if (got < t.hp) return;

      // ── Broken: award yield, then handle regrow / removal ──
      hits.current.delete(t.id);
      useInventoryStore.getState().add(t.yieldKey, t.yieldQty);
      const m = itemMeta(t.yieldKey);
      useGameplayStore.getState().pushToast(`+${t.yieldQty} ${m.icon} ${m.name}`, performance.now());

      if (t.kind === 'tree') {
        ns.breakNode(t.id, now + REGROW_TREE);
        window.setTimeout(() => useNodeStateStore.getState().restore(t.id), REGROW_TREE);
      } else if (t.kind === 'bush') {
        ns.breakNode(t.id, now + REGROW_BUSH);
        window.setTimeout(() => useNodeStateStore.getState().restore(t.id), REGROW_BUSH);
      } else {
        // stone / boulder: gone for good here…
        if (t.id.startsWith('d:')) ns.removeDynamic(t.id);
        else ns.breakNode(t.id, null);
        // …but a new stone appears somewhere off-screen.
        spawnStoneOutOfView(camera.position.x, camera.position.z);
      }
    };

    const onMouse = (e: MouseEvent) => {
      // Left-click always gathers (casting is on right-click now).
      if (e.button === 0 && useUiStore.getState().panel === 'none') hit();
    };
    window.addEventListener('mousedown', onMouse);
    return () => window.removeEventListener('mousedown', onMouse);
  }, [camera]);

  return null;
}
