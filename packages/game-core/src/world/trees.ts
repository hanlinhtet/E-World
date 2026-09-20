/**
 * Deterministic tree placement. Trees are a pure function of (seed, chunk), so
 * the renderer (Chunk.tsx) and the collision system (FpsController) agree on
 * exactly where every trunk is — what you see is what blocks you. Results are
 * cached per chunk since they never change for a given seed.
 */
import { Biome, CHUNK_SIZE } from '@eworld/shared';
import { sampleTerrain } from './terrain';
import { hash2, mulberry32 } from '../math/rng';

export interface ChunkTree {
  /** stable id across sessions (deterministic from chunk + index) */
  id: string;
  /** position local to the chunk origin (for rendering inside the chunk group) */
  lx: number;
  lz: number;
  /** absolute world position (for collision) */
  wx: number;
  wz: number;
  /** ground height at the trunk */
  y: number;
  trunkH: number;
  canopyR: number;
  rot: number;
  hue: number;
  /** trunk collision radius */
  collideR: number;
}

const E = 0.6;
const cache = new Map<string, ChunkTree[]>();

export function getChunkTrees(seed: number, cx: number, cz: number): ChunkTree[] {
  const key = `${seed}:${cx}:${cz}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rng = mulberry32((hash2(seed + 991, cx, cz) * 0xffffffff) >>> 0);
  const trees: ChunkTree[] = [];
  const candidates = 40;
  for (let i = 0; i < candidates; i++) {
    const lx = (rng() - 0.5) * CHUNK_SIZE;
    const lz = (rng() - 0.5) * CHUNK_SIZE;
    const wx = cx * CHUNK_SIZE + lx;
    const wz = cz * CHUNK_SIZE + lz;
    const s = sampleTerrain(seed, wx, wz);
    if (s.biome !== Biome.Forest || s.height < 2) continue;

    const nx = sampleTerrain(seed, wx - E, wz).height - sampleTerrain(seed, wx + E, wz).height;
    const nz = sampleTerrain(seed, wx, wz - E).height - sampleTerrain(seed, wx, wz + E).height;
    const slope = (2 * E) / Math.hypot(nx, 2 * E, nz);
    if (slope < 0.9) continue; // skip steep ground
    if (rng() > 0.65) continue; // thin out for clearings

    const scale = 0.8 + rng() * 0.9;
    trees.push({
      id: `t:${cx}:${cz}:${i}`,
      lx,
      lz,
      wx,
      wz,
      y: s.height,
      trunkH: 3 + scale * 3,
      canopyR: 1.6 + scale * 1.6,
      rot: rng() * Math.PI * 2,
      hue: 0.25 + (rng() - 0.5) * 0.06,
      collideR: 0.3 + scale * 0.12,
    });
  }

  cache.set(key, trees);
  return trees;
}

/** All trees in the 3×3 block of chunks around a world position (for collision). */
export function treesNear(seed: number, x: number, z: number): ChunkTree[] {
  const ccx = Math.floor(x / CHUNK_SIZE + 0.5);
  const ccz = Math.floor(z / CHUNK_SIZE + 0.5);
  const out: ChunkTree[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const list = getChunkTrees(seed, ccx + dx, ccz + dz);
      for (let k = 0; k < list.length; k++) out.push(list[k]!);
    }
  }
  return out;
}
