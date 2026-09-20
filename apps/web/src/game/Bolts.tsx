'use client';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useBoltsStore, type Bolt } from '@/store/bolts.store';

const SEGMENTS = 8;

/** Renders brief jagged lightning arcs. */
export function Bolts() {
  const bolts = useBoltsStore((s) => s.bolts);
  useFrame(() => useBoltsStore.getState().prune(performance.now()));
  return (
    <>
      {bolts.map((b) => (
        <Arc key={b.id} bolt={b} />
      ))}
    </>
  );
}

function Arc({ bolt }: { bolt: Bolt }) {
  const points = useMemo(() => {
    const a = new THREE.Vector3(bolt.ax, bolt.ay, bolt.az);
    const b = new THREE.Vector3(bolt.bx, bolt.by, bolt.bz);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length() || 1;
    // two perpendicular axes for random jaggedness
    const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const p1 = new THREE.Vector3().crossVectors(dir, up).normalize();
    const p2 = new THREE.Vector3().crossVectors(dir, p1).normalize();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const base = new THREE.Vector3().lerpVectors(a, b, t);
      if (i > 0 && i < SEGMENTS) {
        const j = len * 0.09;
        base.addScaledVector(p1, (Math.random() - 0.5) * j);
        base.addScaledVector(p2, (Math.random() - 0.5) * j);
      }
      pts.push(base);
    }
    return pts;
  }, [bolt]);

  return <Line points={points} color={bolt.color} lineWidth={2.5} transparent opacity={0.95} toneMapped={false} />;
}
