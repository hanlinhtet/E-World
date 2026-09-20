'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useCampfiresStore, type Campfire } from '@/store/campfires.store';
import { useInventoryStore } from '@/store/inventory.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { itemMeta } from './items';

/** Renders placed campfires (logs + stone ring; flames + light when lit) and
 *  finishes cooking when its timer elapses. */
export function Campfires() {
  const campfires = useCampfiresStore((s) => s.campfires);

  useFrame(() => {
    const now = performance.now();
    for (const c of campfires) {
      if (c.cookingUntil && now >= c.cookingUntil) {
        useCampfiresStore.getState().update(c.id, { cookingUntil: 0 });
        useInventoryStore.getState().add('cooked_meat', 1);
        const m = itemMeta('cooked_meat');
        useGameplayStore.getState().pushToast(`+1 ${m.icon} ${m.name}`, now);
      }
    }
  });

  return (
    <>
      {campfires.map((c) => (
        <CampfireMesh key={c.id} fire={c} />
      ))}
    </>
  );
}

function CampfireMesh({ fire }: { fire: Campfire }) {
  const flame = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!flame.current) return;
    flame.current.visible = fire.lit;
    if (light.current) light.current.intensity = fire.lit ? 4 + Math.sin(performance.now() * 0.02) * 1.5 : 0;
    if (fire.lit) flame.current.scale.y = 0.8 + Math.abs(Math.sin(performance.now() * 0.018)) * 0.5;
  });

  const stones: [number, number][] = [
    [0.5, 0], [0.35, 0.35], [0, 0.5], [-0.35, 0.35], [-0.5, 0], [-0.35, -0.35], [0, -0.5], [0.35, -0.35],
  ];

  return (
    <group position={[fire.x, fire.y, fire.z]}>
      {/* stone ring */}
      {stones.map(([sx, sz], i) => (
        <mesh key={i} position={[sx, 0.12, sz]} castShadow>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial color="#7d7a73" roughness={1} />
        </mesh>
      ))}
      {/* crossed logs */}
      <mesh position={[0, 0.14, 0]} rotation={[0, 0.5, Math.PI / 2.1]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
        <meshStandardMaterial color="#5a3d24" roughness={1} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[0, -0.6, Math.PI / 2.1]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
        <meshStandardMaterial color="#4a3320" roughness={1} />
      </mesh>

      {/* flames (only when lit) */}
      <group ref={flame} position={[0, 0.3, 0]} visible={false}>
        <mesh>
          <coneGeometry args={[0.28, 0.7, 8]} />
          <meshBasicMaterial color="#ff5a1f" transparent opacity={0.85} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.16, 0.5, 8]} />
          <meshBasicMaterial color="#ffd23a" transparent opacity={0.9} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 0.6, 0]} color="#ff8030" intensity={0} distance={9} />
    </group>
  );
}
