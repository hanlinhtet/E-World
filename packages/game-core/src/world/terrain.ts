/**
 * Deterministic terrain + biome assignment. Height and biome are pure functions
 * of (seed, worldX, worldZ). The client meshes terrain locally from these; the
 * server uses the same height to validate player ground position.
 */
import { Biome } from '@eworld/shared';
import { fbm2D } from '../math/rng';

export interface TerrainSample {
  /** terrain height in meters */
  height: number;
  /** 0..1 */
  moisture: number;
  /** 0..1 */
  temperature: number;
  biome: Biome;
}

export const SEA_LEVEL = 0;
export const MAX_ELEVATION = 220;

/** Sample the terrain at a world-space (x, z) coordinate. */
export function sampleTerrain(seed: number, x: number, z: number): TerrainSample {
  // Continent shape + mountains at different frequencies.
  const continent = fbm2D(seed, x * 0.0012, z * 0.0012, 4);
  const hills = fbm2D(seed + 7, x * 0.01, z * 0.01, 5);
  const ridges = Math.pow(fbm2D(seed + 31, x * 0.004, z * 0.004, 4), 2);

  const elevation = continent * 0.6 + hills * 0.25 + ridges * 0.5;
  const height = (elevation - 0.35) * MAX_ELEVATION;

  const moisture = fbm2D(seed + 101, x * 0.0025, z * 0.0025, 4);
  // Temperature falls off with altitude and varies by latitude (z).
  const base = fbm2D(seed + 211, x * 0.0018, z * 0.0018, 3);
  const temperature = Math.max(
    0,
    Math.min(1, base - Math.max(0, height) / MAX_ELEVATION),
  );

  return { height, moisture, temperature, biome: classifyBiome(height, moisture, temperature) };
}

/** Whittaker-style biome classification from elevation/moisture/temperature. */
export function classifyBiome(height: number, moisture: number, temperature: number): Biome {
  if (height < SEA_LEVEL - 4) return Biome.Ocean;
  if (height < SEA_LEVEL + 2) return Biome.Beach;

  if (height > 160) return temperature < 0.3 ? Biome.Snow : Biome.Mountain;

  if (temperature > 0.75 && moisture < 0.25) return Biome.Desert;
  if (temperature > 0.7 && moisture > 0.6) return Biome.Swamp;
  if (temperature < 0.25) return Biome.Snow;

  return Biome.Forest;
}
