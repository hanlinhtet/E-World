/**
 * Deterministic scatter props: boulders, small stones, and bushes. Like trees,
 * they are a pure function of (seed, chunk) so the renderer and the collision /
 * harvest systems all agree. Also exposes unified helpers for what the player
 * can collide with and what they can harvest near a point.
 */
import { Biome, CHUNK_SIZE } from '@eworld/shared';
import { sampleTerrain } from './terrain';
import { hash2, mulberry32 } from '../math/rng';
import { getChunkTrees } from './trees';

export type PropKind = 'rock' | 'stone' | 'bush';

export interface ChunkProp {
  id: string;
  kind: PropKind;
  lx: number;
  lz: number;
  wx: number;
  wz: number;
  y: number;
  scale: number;
  rot: number;
  /** horizontal collision radius; 0 = passable */
  collideR: number;
}

const E = 0.6;
const cache = new Map<string, ChunkProp[]>();

export function getChunkProps(seed: number, cx: number, cz: number): ChunkProp[] {
  const key = `${seed}:${cx}:${cz}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rng = mulberry32((hash2(seed + 555, cx, cz) * 0xffffffff) >>> 0);
  const props: ChunkProp[] = [];
  const candidates = 46;
  for (let i = 0; i < candidates; i++) {
    const lx = (rng() - 0.5) * CHUNK_SIZE;
    const lz = (rng() - 0.5) * CHUNK_SIZE;
    const wx = cx * CHUNK_SIZE + lx;
    const wz = cz * CHUNK_SIZE + lz;
    const s = sampleTerrain(seed, wx, wz);
    if (s.height < 0.5 || s.biome === Biome.Ocean) continue; // not underwater

    const roll = rng();
    let kind: PropKind;
    let scale: number;
    let collideR: number;
    if (roll < 0.14) {
      // big boulder (solid)
      kind = 'rock';
      scale = 1.4 + rng() * 1.8;
      collideR = scale * 0.55;
    } else if (roll < 0.42) {
      // small stone (passable)
      kind = 'stone';
      scale = 0.3 + rng() * 0.4;
      collideR = 0;
    } else if (roll < 0.78 && (s.biome === Biome.Forest || s.biome === Biome.Swamp)) {
      // bush (passable)
      kind = 'bush';
      scale = 0.6 + rng() * 0.6;
      collideR = 0;
    } else {
      continue; // empty cell
    }

    props.push({
      id: `${kind[0]}:${cx}:${cz}:${i}`,
      kind,
      lx,
      lz,
      wx,
      wz,
      y: s.height,
      scale,
      rot: rng() * Math.PI * 2,
      collideR,
    });
  }

  cache.set(key, props);
  return props;
}

// ── Ponds (small flat water bodies on gentle land) ──────────────────────
export interface ChunkPond {
  lx: number;
  lz: number;
  y: number;
  radius: number;
}

const pondCache = new Map<string, ChunkPond[]>();

export function getChunkPonds(seed: number, cx: number, cz: number): ChunkPond[] {
  const key = `${seed}:${cx}:${cz}`;
  const cached = pondCache.get(key);
  if (cached) return cached;

  const rng = mulberry32((hash2(seed + 777, cx, cz) * 0xffffffff) >>> 0);
  const ponds: ChunkPond[] = [];
  for (let i = 0; i < 5; i++) {
    const lx = (rng() - 0.5) * CHUNK_SIZE;
    const lz = (rng() - 0.5) * CHUNK_SIZE;
    const wx = cx * CHUNK_SIZE + lx;
    const wz = cz * CHUNK_SIZE + lz;
    const s = sampleTerrain(seed, wx, wz);
    if (s.height < 2 || s.height > 55) continue;
    if (s.biome !== Biome.Forest && s.biome !== Biome.Swamp) continue;
    // only on gentle ground so the disc sits flush
    const nx = sampleTerrain(seed, wx - E, wz).height - sampleTerrain(seed, wx + E, wz).height;
    const nz = sampleTerrain(seed, wx, wz - E).height - sampleTerrain(seed, wx, wz + E).height;
    const slope = (2 * E) / Math.hypot(nx, 2 * E, nz);
    if (slope < 0.985) continue;
    if (rng() > 0.5) continue;
    ponds.push({ lx, lz, y: s.height, radius: 3 + rng() * 4 });
  }
  pondCache.set(key, ponds);
  return ponds;
}

export interface Collider {
  wx: number;
  wz: number;
  collideR: number;
}

/**
 * Solid obstacles to push out of — tree trunks only. Boulders are NOT solid
 * walls; they are walkable domes folded into `surfaceHeight` so the player can
 * climb on top of them.
 */
export function collidersNear(seed: number, x: number, z: number): Collider[] {
  const ccx = Math.floor(x / CHUNK_SIZE + 0.5);
  const ccz = Math.floor(z / CHUNK_SIZE + 0.5);
  const out: Collider[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (const t of getChunkTrees(seed, ccx + dx, ccz + dz)) {
        out.push({ wx: t.wx, wz: t.wz, collideR: t.collideR });
      }
    }
  }
  return out;
}

/**
 * Walkable surface height at a world point: the terrain, raised by any boulder
 * the point sits over (each boulder is treated as a smooth dome). This lets the
 * player walk up and stand on top of rocks rather than be blocked by them.
 */
export function surfaceHeight(
  seed: number,
  x: number,
  z: number,
  isRemoved?: (id: string) => boolean,
): number {
  let h = sampleTerrain(seed, x, z).height;
  const ccx = Math.floor(x / CHUNK_SIZE + 0.5);
  const ccz = Math.floor(z / CHUNK_SIZE + 0.5);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (const p of getChunkProps(seed, ccx + dx, ccz + dz)) {
        if (p.kind !== 'rock') continue;
        if (isRemoved && isRemoved(p.id)) continue; // mined boulders flatten out
        const ddx = x - p.wx;
        const ddz = z - p.wz;
        const r = p.scale * 1.05;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 < r * r) {
          const dome = p.y + p.scale * 1.0 * Math.sqrt(1 - d2 / (r * r));
          if (dome > h) h = dome;
        }
      }
    }
  }
  return h;
}

export type HarvestKind = 'tree' | 'rock' | 'stone' | 'bush';
/** Which swing animation a node uses. */
export type HarvestAction = 'chop' | 'mine' | 'hit';

export interface HarvestNode {
  id: string;
  kind: HarvestKind;
  action: HarvestAction;
  wx: number;
  wz: number;
  y: number;
  /** aim sphere center height + radius (for crosshair ray-vs-sphere targeting) */
  cy: number;
  aimR: number;
  /** hits needed to break it */
  hp: number;
  label: string; // e.g. "Oak Tree"
  yieldKey: string; // item key
  yieldQty: number; // awarded on break
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Everything harvestable in the 3×3 chunks around a point. */
export function harvestablesNear(seed: number, x: number, z: number): HarvestNode[] {
  const ccx = Math.floor(x / CHUNK_SIZE + 0.5);
  const ccz = Math.floor(z / CHUNK_SIZE + 0.5);
  const out: HarvestNode[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const cx = ccx + dx;
      const cz = ccz + dz;
      for (const t of getChunkTrees(seed, cx, cz)) {
        out.push({
          id: t.id,
          kind: 'tree',
          action: 'chop',
          wx: t.wx,
          wz: t.wz,
          y: t.y,
          cy: t.y + t.trunkH * 0.55,
          aimR: Math.max(t.canopyR * 0.7, 1.2),
          hp: clamp(Math.round(t.trunkH), 5, 9),
          label: 'Tree',
          yieldKey: 'wood',
          yieldQty: clamp(Math.round(t.trunkH * 0.8), 3, 7),
        });
      }
      for (const p of getChunkProps(seed, cx, cz)) {
        if (p.kind === 'rock') {
          out.push({
            id: p.id, kind: 'rock', action: 'mine', wx: p.wx, wz: p.wz, y: p.y,
            cy: p.y + p.scale * 0.4, aimR: p.scale * 0.7, hp: 6,
            label: 'Boulder', yieldKey: 'stone', yieldQty: clamp(Math.round(p.scale * 2), 3, 6),
          });
        } else if (p.kind === 'stone') {
          out.push({
            id: p.id, kind: 'stone', action: 'mine', wx: p.wx, wz: p.wz, y: p.y,
            cy: p.y + p.scale * 0.5, aimR: Math.max(p.scale, 0.5), hp: 1,
            label: 'Stone', yieldKey: 'stone', yieldQty: 1,
          });
        } else {
          out.push({
            id: p.id, kind: 'bush', action: 'hit', wx: p.wx, wz: p.wz, y: p.y,
            cy: p.y + p.scale * 0.45, aimR: Math.max(p.scale, 0.6), hp: 2,
            label: 'Bush', yieldKey: 'fiber', yieldQty: 1,
          });
        }
      }
    }
  }
  return out;
}
