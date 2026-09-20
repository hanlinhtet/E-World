'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import type * as THREE from 'three';
import { useDamageStore, type DamageNumber } from '@/store/damage.store';

const LIFE = 1100; // ms, matches store prune window

/** Red floating "-N" numbers that rise and fade where spells hit. */
export function DamageNumbers() {
  const numbers = useDamageStore((s) => s.numbers);
  useFrame(() => useDamageStore.getState().prune(performance.now()));
  return (
    <>
      {numbers.map((n) => (
        <Floater key={n.id} n={n} />
      ))}
    </>
  );
}

function Floater({ n }: { n: DamageNumber }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const t = Math.min(1, (performance.now() - n.start) / LIFE);
    ref.current.position.set(n.x, n.y + 0.6 + t * 1.4, n.z); // rise
    const scale = (n.big ? 1.6 : 1) * (1 - t * 0.25);
    ref.current.scale.setScalar(scale);
  });
  return (
    <Billboard ref={ref} position={[n.x, n.y + 0.6, n.z]}>
      <Text
        fontSize={0.6}
        color={n.big ? '#ff3030' : '#ff7a7a'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#2a0000"
      >
        {`-${n.amount}`}
      </Text>
    </Billboard>
  );
}
