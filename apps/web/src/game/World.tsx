'use client';
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CHUNK_SIZE } from '@eworld/shared';
import { Chunk } from './Chunk';

/** How many chunks to keep loaded in each direction around the player. */
const RENDER_RADIUS = 4;
const WATER_SIZE = (RENDER_RADIUS * 2 + 3) * CHUNK_SIZE;

interface ActiveChunk {
  cx: number;
  cz: number;
  key: string;
}

/**
 * Infinite, Minecraft-style streamed world. The terrain is a pure function of
 * the world seed, so we simply load the ring of chunks around the player and
 * unload the rest as they move — there is no world boundary. A large translucent
 * water plane follows the camera to fill ocean/low areas.
 */
export function World() {
  const { camera } = useThree();
  const center = useRef<{ cx: number; cz: number }>({ cx: NaN, cz: NaN });
  const water = useRef<THREE.Mesh>(null);
  const [chunks, setChunks] = useState<ActiveChunk[]>([]);

  useFrame(() => {
    const cx = Math.floor(camera.position.x / CHUNK_SIZE + 0.5);
    const cz = Math.floor(camera.position.z / CHUNK_SIZE + 0.5);

    // Keep the water centered on the player so it always reaches the horizon.
    if (water.current) {
      water.current.position.x = camera.position.x;
      water.current.position.z = camera.position.z;
    }

    // Only recompute the active set when the player crosses a chunk boundary.
    if (cx === center.current.cx && cz === center.current.cz) return;
    center.current = { cx, cz };

    const next: ActiveChunk[] = [];
    const r2 = (RENDER_RADIUS + 0.5) ** 2;
    for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
      for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
        if (dx * dx + dz * dz > r2) continue; // round the load area
        const X = cx + dx;
        const Z = cz + dz;
        next.push({ cx: X, cz: Z, key: `${X},${Z}` });
      }
    }
    setChunks(next);
  });

  return (
    <group>
      {chunks.map((c) => (
        <Chunk key={c.key} cx={c.cx} cz={c.cz} />
      ))}

      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <planeGeometry args={[WATER_SIZE, WATER_SIZE]} />
        <meshStandardMaterial
          color="#2b6fa8"
          transparent
          opacity={0.78}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}
