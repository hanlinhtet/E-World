'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useCombatStore, type Projectile } from '@/store/combat.store';
import { useAnimalsStore } from '@/store/animals.store';
import { useMonstersStore } from '@/store/monsters.store';
import { useEffectsStore } from '@/store/effects.store';
import { useDamageStore } from '@/store/damage.store';
import { useExplosionsStore } from '@/store/explosions.store';
import { useCampfiresStore } from '@/store/campfires.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { usePlayerStore } from '@/store/player.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const LIFE = 3000;
const BOLT_GRAV = 2;

/** Apply damage to every animal/monster within `radius` of a point. */
export function damageArea(x: number, y: number, z: number, radius: number, dmg: number, color: string, now: number): void {
  const r2 = radius * radius;
  const animals = useAnimalsStore.getState().animals;
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i]!;
    if (a.dead) continue;
    if ((a.x - x) ** 2 + (a.y - y) ** 2 + (a.z - z) ** 2 < r2) {
      a.hp -= dmg;
      a.flashUntil = now + 160;
      a.fleeUntil = now + 3500;
      useDamageStore.getState().add(a.x, a.y + a.size + 0.4, a.z, dmg, dmg >= 60, now);
    }
  }
  const monsters = useMonstersStore.getState().monsters;
  for (let i = 0; i < monsters.length; i++) {
    const m = monsters[i]!;
    if (m.dead) continue;
    if ((m.x - x) ** 2 + (m.y - y) ** 2 + (m.z - z) ** 2 < r2) {
      m.hp -= dmg;
      m.flashUntil = now + 160;
      useDamageStore.getState().add(m.x, m.y + m.size * 1.7, m.z, dmg, dmg >= 60, now);
    }
  }
  useEffectsStore.getState().spawnBurst(x, y, z, color, now);
}

/** Soak/slow all animals/monsters in radius (water spells). */
export function slowArea(cx: number, cz: number, radius: number, until: number): void {
  const r2 = radius * radius;
  for (const a of useAnimalsStore.getState().animals) {
    if (!a.dead && (a.x - cx) ** 2 + (a.z - cz) ** 2 < r2) a.slowUntil = until;
  }
  for (const m of useMonstersStore.getState().monsters) {
    if (!m.dead && (m.x - cx) ** 2 + (m.z - cz) ** 2 < r2) m.slowUntil = until;
  }
}

/** Electric stun all animals/monsters in radius. */
export function stunArea(cx: number, cz: number, radius: number, until: number): void {
  const r2 = radius * radius;
  for (const a of useAnimalsStore.getState().animals) {
    if (!a.dead && (a.x - cx) ** 2 + (a.z - cz) ** 2 < r2) a.stunUntil = until;
  }
  for (const m of useMonstersStore.getState().monsters) {
    if (!m.dead && (m.x - cx) ** 2 + (m.z - cz) ** 2 < r2) m.stunUntil = until;
  }
}

/** Knock back animals/monsters in radius (and toss them up), and the player too
 *  (so a ground blast beneath you launches you skyward — a blast jump). `up` is
 *  the vertical launch force; defaults to a fraction of the horizontal force. */
export function knockArea(cx: number, cy: number, cz: number, radius: number, force: number, now: number, up?: number): void {
  const lift = up ?? force * 0.4;
  const animals = useAnimalsStore.getState().animals;
  for (let i = 0; i < animals.length; i++) {
    const a = animals[i]!;
    if (a.dead) continue;
    const dx = a.x - cx;
    const dz = a.z - cz;
    const dist = Math.hypot(dx, dz);
    if (dist > radius) continue;
    const t = 1 - dist / radius;
    const inv = 1 / (dist || 1);
    a.knockX = dx * inv * force * t;
    a.knockZ = dz * inv * force * t;
    a.knockVY = lift * t;
    a.knockUntil = now + 900;
    a.fleeUntil = now + 3500;
  }
  const monsters = useMonstersStore.getState().monsters;
  for (let i = 0; i < monsters.length; i++) {
    const m = monsters[i]!;
    if (m.dead) continue;
    const dx = m.x - cx;
    const dz = m.z - cz;
    const dist = Math.hypot(dx, dz);
    if (dist > radius) continue;
    const t = 1 - dist / radius;
    const inv = 1 / (dist || 1);
    m.knockX = dx * inv * force * t;
    m.knockZ = dz * inv * force * t;
    m.knockVY = lift * t;
    m.knockUntil = now + 900;
  }
  // Player: shove away horizontally + launch up (stronger the closer the blast).
  const p = usePlayerStore.getState().position;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const dz = p.z - cz;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < radius + 1) {
    const t = 1 - Math.min(1, dist / (radius + 1));
    const horiz = Math.hypot(dx, dz) || 1;
    usePlayerStore.getState().applyImpulse(
      (dx / horiz) * force * 0.8 * t,
      lift * t + 2, // upward launch (blast jump)
      (dz / horiz) * force * 0.8 * t,
    );
  }
}

/** Renders + integrates spell projectiles. */
export function Projectiles() {
  const projectiles = useCombatStore((s) => s.projectiles);
  return (
    <>
      {projectiles.map((p) => (
        <ProjectileMesh key={p.id} p={p} />
      ))}
    </>
  );
}

function ProjectileMesh({ p }: { p: Projectile }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, dtRaw) => {
    if (!ref.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const now = performance.now();

    p.vy -= (p.grav ?? BOLT_GRAV) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.grow) p.radius += p.grow * dt; // charged shots keep swelling
    ref.current.position.set(p.x, p.y, p.z);
    ref.current.scale.setScalar(p.visual ?? Math.max(0.18, p.radius * 0.5));

    const finish = (hx: number, hy: number, hz: number) => {
      if (p.aoe && p.aoe > 0) {
        damageArea(hx, hy, hz, p.aoe, p.damage, p.color, now);
        useExplosionsStore.getState().add(hx, hy, hz, p.aoe, p.color, now);
      } else {
        useEffectsStore.getState().spawnBurst(hx, hy, hz, p.color, now);
      }
      if (p.knock && p.knock > 0) knockArea(hx, hy, hz, (p.aoe ?? 2) + 1, p.knock, now);
      // Fire spells light a nearby unlit campfire.
      if (p.ignites) {
        const fires = useCampfiresStore.getState().campfires;
        for (let i = 0; i < fires.length; i++) {
          const f = fires[i]!;
          if (!f.lit && (f.x - hx) ** 2 + (f.z - hz) ** 2 < 9) {
            useCampfiresStore.getState().update(f.id, { lit: true });
            useGameplayStore.getState().pushToast('🔥 Campfire lit!', now);
            break;
          }
        }
      }
      useCombatStore.getState().removeProjectile(p.id);
    };

    // Direct hits (single-target spells deal damage here; AoE handled in finish)
    const animals = useAnimalsStore.getState().animals;
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i]!;
      if (a.dead) continue;
      const rr = p.radius + a.size;
      if ((a.x - p.x) ** 2 + (a.y + a.size - p.y) ** 2 + (a.z - p.z) ** 2 < rr * rr) {
        if (!p.aoe) {
          a.hp -= p.damage;
          a.flashUntil = now + 160;
          a.fleeUntil = now + 3500;
          if (p.slow) a.slowUntil = now + p.slow;
          // survived a water hit → bubble it up into the air
          if (p.bubble && a.hp > 0) {
            a.bubbleUntil = now + p.bubble;
            a.bubbleNextTick = now + 500;
          }
          useDamageStore.getState().add(a.x, a.y + a.size + 0.4, a.z, p.damage, p.damage >= 60, now);
        }
        finish(p.x, p.y, p.z);
        return;
      }
    }
    const monsters = useMonstersStore.getState().monsters;
    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i]!;
      if (m.dead) continue;
      const rr = p.radius + m.size;
      if ((m.x - p.x) ** 2 + (m.y + m.size - p.y) ** 2 + (m.z - p.z) ** 2 < rr * rr) {
        if (!p.aoe) {
          m.hp -= p.damage;
          m.flashUntil = now + 160;
          if (p.slow) m.slowUntil = now + p.slow;
          if (p.bubble && m.hp > 0) {
            m.bubbleUntil = now + p.bubble;
            m.bubbleNextTick = now + 500;
          }
          useDamageStore.getState().add(m.x, m.y + m.size * 1.7, m.z, p.damage, p.damage >= 60, now);
        }
        finish(p.x, p.y, p.z);
        return;
      }
    }

    if (p.y <= surfaceHeight(SEED, p.x, p.z) || now - p.bornAt > LIFE) {
      finish(p.x, p.y, p.z);
    }
  });

  return (
    <mesh ref={ref} position={[p.x, p.y, p.z]}>
      <sphereGeometry args={[1, 14, 12]} />
      <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={2.4} toneMapped={false} />
      <pointLight color={p.color} intensity={5} distance={9} />
    </mesh>
  );
}
