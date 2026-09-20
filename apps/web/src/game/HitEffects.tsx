'use client';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useEffectsStore, type Burst as BurstData } from '@/store/effects.store';

const BITS = 8;
const LIFE = 600; // ms, matches effects.store prune window

/** Renders active impact bursts as little chunks that fly out and shrink. */
export function HitEffects() {
  const bursts = useEffectsStore((s) => s.bursts);
  return (
    <>
      {bursts.map((b) => (
        <Burst key={b.id} burst={b} />
      ))}
    </>
  );
}

function Burst({ burst }: { burst: BurstData }) {
  const group = useRef<THREE.Group>(null);
  const vels = useMemo(
    () =>
      Array.from({ length: BITS }, (_, i) => {
        const a = (i / BITS) * Math.PI * 2;
        const spread = 1.6 + (i % 3) * 0.5;
        return new THREE.Vector3(Math.cos(a) * spread, 2.2 + (i % 4) * 0.5, Math.sin(a) * spread);
      }),
    [],
  );

  useFrame(() => {
    if (!group.current) return;
    const t = Math.min(1, (performance.now() - burst.start) / LIFE);
    const kids = group.current.children;
    for (let i = 0; i < kids.length; i++) {
      const v = vels[i]!;
      const c = kids[i]!;
      c.position.set(v.x * t, v.y * t - 5 * t * t, v.z * t);
      const s = Math.max(0, 0.14 * (1 - t));
      c.scale.setScalar(s);
    }
  });

  return (
    <group ref={group} position={[burst.x, burst.y, burst.z]}>
      {Array.from({ length: BITS }).map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={burst.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
