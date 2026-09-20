'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useTornadoesStore, type Tornado as TornadoData } from '@/store/tornadoes.store';
import { useAnimalsStore } from '@/store/animals.store';
import { useMonstersStore } from '@/store/monsters.store';
import { useDamageStore } from '@/store/damage.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const TICK_MS = 220;

/** Persistent twisters: spin, pull nearby enemies toward the eye, and shred. */
export function Tornado() {
  const tornadoes = useTornadoesStore((s) => s.tornadoes);
  return (
    <>
      {tornadoes.map((t) => (
        <TornadoMesh key={t.id} data={t} />
      ))}
    </>
  );
}

function TornadoMesh({ data }: { data: TornadoData }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();
    const t = (now - data.start) / data.duration;
    if (t >= 1) {
      useTornadoesStore.getState().remove(data.id);
      return;
    }
    g.rotation.y = now * 0.012;

    if (now - data.lastTick >= TICK_MS) {
      data.lastTick = now;
      const r2 = data.radius * data.radius;
      const pull = (e: { x: number; z: number; knockX: number; knockZ: number; knockVY: number; knockUntil: number }, ex: number, ez: number) => {
        const dx = data.x - ex;
        const dz = data.z - ez;
        const d = Math.hypot(dx, dz) || 1;
        // suck inward + a little spin tangent + lift
        e.knockX = (dx / d) * 6 + (-dz / d) * 4;
        e.knockZ = (dz / d) * 6 + (dx / d) * 4;
        e.knockVY = 6;
        e.knockUntil = now + 260;
      };
      const monsters = useMonstersStore.getState().monsters;
      for (let i = 0; i < monsters.length; i++) {
        const m = monsters[i]!;
        if (m.dead) continue;
        if ((m.x - data.x) ** 2 + (m.z - data.z) ** 2 < r2) {
          m.hp -= data.damage;
          m.flashUntil = now + 120;
          pull(m, m.x, m.z);
          useDamageStore.getState().add(m.x, m.y + m.size * 1.7, m.z, data.damage, false, now);
        }
      }
      const animals = useAnimalsStore.getState().animals;
      for (let i = 0; i < animals.length; i++) {
        const a = animals[i]!;
        if (a.dead) continue;
        if ((a.x - data.x) ** 2 + (a.z - data.z) ** 2 < r2) {
          a.hp -= data.damage;
          a.flashUntil = now + 120;
          a.fleeUntil = now + 2000;
          pull(a, a.x, a.z);
          useDamageStore.getState().add(a.x, a.y + a.size + 0.4, a.z, data.damage, false, now);
        }
      }
    }
  });

  const y = surfaceHeight(SEED, data.x, data.z);
  return (
    <group ref={group} position={[data.x, y, data.z]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 1 + i * 1.6, 0]} rotation={[0, i * 0.9, 0]}>
          <coneGeometry args={[(0.6 + i * 0.5) * (data.radius / 5), 2, 9, 1, true]} />
          <meshBasicMaterial color={data.color} transparent opacity={0.45} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 4, 0]} color={data.color} intensity={2} distance={data.radius * 4} />
    </group>
  );
}
