'use client';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { useNodeStateStore } from '@/store/nodeState.store';

/** Stones that have respawned at runtime (world-space, not tied to a chunk). */
export function DynamicStones() {
  const dynamic = useNodeStateStore((s) => s.dynamic);
  if (dynamic.length === 0) return null;
  return (
    <Instances key={dynamic.length} limit={Math.max(64, dynamic.length)} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.95} flatShading />
      {dynamic.map((d) => (
        <Instance
          key={d.id}
          position={[d.x, d.y + d.scale * 0.4, d.z]}
          scale={[d.scale, d.scale * 0.75, d.scale]}
          rotation={[d.scale, d.x, d.z]}
          color={new THREE.Color().setHSL(0.08, 0.05, 0.45)}
        />
      ))}
    </Instances>
  );
}
