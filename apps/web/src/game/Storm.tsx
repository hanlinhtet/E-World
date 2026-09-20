'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useStormsStore, type Storm as StormData } from '@/store/storms.store';
import { useBoltsStore } from '@/store/bolts.store';
import { useAnimalsStore } from '@/store/animals.store';
import { useMonstersStore } from '@/store/monsters.store';
import { useDamageStore } from '@/store/damage.store';
import { useEffectsStore } from '@/store/effects.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const STRIKE_MS = 320;
const STRIKE_HIT_R = 3.5;

/** A storm cloud that hovers over an area and rains lightning bolts. */
export function Storm() {
  const storms = useStormsStore((s) => s.storms);
  return (
    <>
      {storms.map((s) => (
        <StormMesh key={s.id} data={s} />
      ))}
    </>
  );
}

function StormMesh({ data }: { data: StormData }) {
  const cloud = useRef<THREE.Group>(null);

  useFrame(() => {
    const now = performance.now();
    const t = (now - data.start) / data.duration;
    if (t >= 1) {
      useStormsStore.getState().remove(data.id);
      return;
    }
    if (cloud.current) cloud.current.rotation.y = now * 0.0006;

    if (now - data.lastStrike >= STRIKE_MS) {
      data.lastStrike = now;
      // strike a random spot inside the storm
      const ang = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * data.radius;
      const sx = data.x + Math.cos(ang) * rr;
      const sz = data.z + Math.sin(ang) * rr;
      const sy = surfaceHeight(SEED, sx, sz);
      useBoltsStore.getState().add([sx, sy + 16, sz], [sx, sy + 0.3, sz], data.color, now);
      useEffectsStore.getState().spawnBurst(sx, sy + 0.4, sz, data.color, now);

      const r2 = STRIKE_HIT_R * STRIKE_HIT_R;
      for (const m of useMonstersStore.getState().monsters) {
        if (!m.dead && (m.x - sx) ** 2 + (m.z - sz) ** 2 < r2) {
          m.hp -= data.damage;
          m.flashUntil = now + 120;
          m.stunUntil = Math.max(m.stunUntil, now + data.stun);
          useDamageStore.getState().add(m.x, m.y + m.size * 1.7, m.z, data.damage, false, now);
        }
      }
      for (const a of useAnimalsStore.getState().animals) {
        if (!a.dead && (a.x - sx) ** 2 + (a.z - sz) ** 2 < r2) {
          a.hp -= data.damage;
          a.flashUntil = now + 120;
          a.fleeUntil = now + 2500;
          useDamageStore.getState().add(a.x, a.y + a.size + 0.4, a.z, data.damage, false, now);
        }
      }
    }
  });

  const y = surfaceHeight(SEED, data.x, data.z);
  return (
    <group position={[data.x, y, data.z]}>
      <group ref={cloud} position={[0, 15, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * data.radius * 0.5, Math.sin(i) * 0.6, Math.sin(a) * data.radius * 0.5]}>
              <sphereGeometry args={[data.radius * 0.4, 12, 10]} />
              <meshStandardMaterial color="#2a2f3e" roughness={1} />
            </mesh>
          );
        })}
        <pointLight color={data.color} intensity={2} distance={data.radius * 5} />
      </group>
    </group>
  );
}
