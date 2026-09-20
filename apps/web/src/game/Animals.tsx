'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useAnimalsStore, type Animal } from '@/store/animals.store';
import { usePlayerStore } from '@/store/player.store';
import { useInventoryStore } from '@/store/inventory.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { useEffectsStore } from '@/store/effects.store';
import { useDamageStore } from '@/store/damage.store';
import { randomAnimalKind } from './animals';
import { itemMeta } from './items';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const TARGET_COUNT = 9;
let seq = 0;

function spawnNear(px: number, pz: number): Animal | null {
  const ang = Math.random() * Math.PI * 2;
  const r = 25 + Math.random() * 40;
  const x = px + Math.cos(ang) * r;
  const z = pz + Math.sin(ang) * r;
  const y = surfaceHeight(SEED, x, z);
  if (y < 0.6) return null; // not on water
  const k = randomAnimalKind();
  return {
    id: `a:${Date.now().toString(36)}-${++seq}`,
    kind: k.key,
    color: k.bodyColor,
    size: k.size,
    speed: k.speed,
    x,
    y,
    z,
    yaw: 0,
    hp: k.hp,
    maxHp: k.hp,
    lootKey: k.lootKey,
    lootQty: k.lootQty,
    targetX: x,
    targetZ: z,
    fleeUntil: 0,
    flashUntil: 0,
    knockX: 0,
    knockZ: 0,
    knockVY: 0,
    knockUntil: 0,
    slowUntil: 0,
    bubbleUntil: 0,
    bubbleNextTick: 0,
    stunUntil: 0,
    dead: false,
  };
}

/** Spawns and manages passive wildlife. They wander, flee when hit, never attack. */
export function Animals() {
  const animals = useAnimalsStore((s) => s.animals);
  const lastSpawn = useRef(0);

  useFrame(() => {
    const now = performance.now();

    // Replenish toward the target population (throttled).
    if (now - lastSpawn.current > 1100 && animals.length < TARGET_COUNT) {
      lastSpawn.current = now;
      const p = usePlayerStore.getState().position;
      const a = spawnNear(p.x, p.z);
      if (a) useAnimalsStore.getState().spawn(a);
    }

    // Death sweep: drop loot + poof + remove.
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i]!;
      if (a.dead) continue;
      if (a.hp <= 0) {
        a.dead = true;
        useInventoryStore.getState().add(a.lootKey, a.lootQty);
        const m = itemMeta(a.lootKey);
        useGameplayStore.getState().pushToast(`+${a.lootQty} ${m.icon} ${m.name}`, now);
        useEffectsStore.getState().spawnBurst(a.x, a.y + a.size, a.z, a.color, now);
        useAnimalsStore.getState().remove(a.id);
      }
    }
  });

  return (
    <>
      {animals.map((a) => (
        <AnimalMesh key={a.id} animal={a} />
      ))}
    </>
  );
}

function AnimalMesh({ animal }: { animal: Animal }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const bubble = useRef<THREE.Mesh>(null);
  const baseColor = useMemo(() => new THREE.Color(animal.color), [animal.color]);
  const flashColor = useMemo(() => new THREE.Color('#ffffff'), []);

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g || animal.dead) return;
    const dt = Math.min(dtRaw, 0.05);
    const now = performance.now();
    const player = usePlayerStore.getState().position;

    // Bubbled (Water Beam non-lethal) — float helpless, taking damage-over-time.
    if (now < animal.bubbleUntil) {
      const ground = surfaceHeight(SEED, animal.x, animal.z);
      animal.y += (ground + 2.2 - animal.y) * Math.min(1, dt * 4);
      if (now >= animal.bubbleNextTick) {
        animal.bubbleNextTick = now + 500;
        animal.hp -= 5;
        animal.flashUntil = now + 120;
        useDamageStore.getState().add(animal.x, animal.y + animal.size + 0.4, animal.z, 5, false, now);
      }
      g.position.set(animal.x, animal.y, animal.z);
      g.rotation.y += dt * 0.6;
      if (bubble.current) bubble.current.visible = true;
      return;
    }
    if (bubble.current) bubble.current.visible = false;

    // Stunned (lightning) — frozen in place until it wears off.
    if (now < animal.stunUntil) {
      animal.y = surfaceHeight(SEED, animal.x, animal.z);
      g.position.set(animal.x, animal.y, animal.z);
      return;
    }

    // Knocked back — slide + get tossed into the air until it settles.
    if (now < animal.knockUntil) {
      animal.x += animal.knockX * dt;
      animal.z += animal.knockZ * dt;
      const damp = Math.max(0, 1 - dt * 3);
      animal.knockX *= damp;
      animal.knockZ *= damp;
      animal.knockVY -= 24 * dt;
      const ground = surfaceHeight(SEED, animal.x, animal.z);
      let ny = animal.y + animal.knockVY * dt;
      if (ny <= ground) {
        ny = ground;
        animal.knockVY = 0;
      }
      animal.y = ny;
      g.position.set(animal.x, animal.y, animal.z);
      return;
    }

    let dx: number;
    let dz: number;
    const fleeing = now < animal.fleeUntil;
    if (fleeing) {
      dx = animal.x - player.x;
      dz = animal.z - player.z;
    } else {
      dx = animal.targetX - animal.x;
      dz = animal.targetZ - animal.z;
      if (dx * dx + dz * dz < 1) {
        // pick a new wander target nearby
        animal.targetX = animal.x + (Math.random() - 0.5) * 24;
        animal.targetZ = animal.z + (Math.random() - 0.5) * 24;
      }
    }
    const len = Math.hypot(dx, dz) || 1;
    const slowMul = now < animal.slowUntil ? 0.4 : 1;
    const speed = (fleeing ? animal.speed * 2 : animal.speed * 0.6) * slowMul;
    animal.x += (dx / len) * speed * dt;
    animal.z += (dz / len) * speed * dt;
    animal.y = surfaceHeight(SEED, animal.x, animal.z);
    animal.yaw = Math.atan2(dx, dz);

    g.position.set(animal.x, animal.y, animal.z);
    g.rotation.y = animal.yaw;

    if (mat.current) {
      const flashing = now < animal.flashUntil;
      mat.current.color.copy(flashing ? flashColor : baseColor);
      mat.current.emissive.setRGB(flashing ? 0.4 : 0, 0, 0);
    }
  });

  const s = animal.size;
  return (
    <group ref={group} position={[animal.x, animal.y, animal.z]}>
      {/* water bubble (shown while bubbled) */}
      <mesh ref={bubble} position={[0, s * 1.1, 0]} visible={false}>
        <sphereGeometry args={[s * 2.2, 16, 14]} />
        <meshStandardMaterial color="#7fd0ff" transparent opacity={0.32} roughness={0.1} metalness={0.1} depthWrite={false} />
      </mesh>
      {/* body */}
      <mesh position={[0, s * 1.1, 0]} castShadow>
        <capsuleGeometry args={[s * 0.6, s * 1.1, 4, 10]} />
        <meshStandardMaterial ref={mat} color={animal.color} roughness={0.85} />
      </mesh>
      {/* head */}
      <mesh position={[0, s * 1.5, s * 0.8]} castShadow>
        <sphereGeometry args={[s * 0.5, 12, 10]} />
        <meshStandardMaterial color={animal.color} roughness={0.85} />
      </mesh>
      {/* legs */}
      {([
        [-s * 0.4, s * 0.5],
        [s * 0.4, s * 0.5],
        [-s * 0.4, -s * 0.5],
        [s * 0.4, -s * 0.5],
      ] as [number, number][]).map(([lx, lz], i) => (
        <mesh key={i} position={[lx, s * 0.45, lz]} castShadow>
          <cylinderGeometry args={[s * 0.12, s * 0.12, s * 0.9, 6]} />
          <meshStandardMaterial color={animal.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
