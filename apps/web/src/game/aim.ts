import type * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);

/**
 * The ground point the camera is looking at. Used by BOTH the target marker and
 * the meteor cast so the circle and the impact are guaranteed to be the same
 * spot. `dir` must be the normalized camera forward.
 */
export function aimGroundPoint(camera: THREE.Camera, dir: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const ox = camera.position.x;
  const oy = camera.position.y;
  const oz = camera.position.z;
  for (let t = 2; t < 70; t += 1) {
    const x = ox + dir.x * t;
    const y = oy + dir.y * t;
    const z = oz + dir.z * t;
    if (y <= surfaceHeight(SEED, x, z)) {
      out.set(x, surfaceHeight(SEED, x, z), z);
      return out;
    }
  }
  const t = 30;
  out.set(ox + dir.x * t, surfaceHeight(SEED, ox + dir.x * t, oz + dir.z * t), oz + dir.z * t);
  return out;
}
