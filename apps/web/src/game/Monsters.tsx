'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useMonstersStore, type Monster, type Arrow } from '@/store/monsters.store';
import { usePlayerStore } from '@/store/player.store';
import { useInventoryStore } from '@/store/inventory.store';
import { useProgressStore } from '@/store/progress.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { useEffectsStore } from '@/store/effects.store';
import { useDamageStore } from '@/store/damage.store';
import { useCampsStore, type ChestLoot } from '@/store/camps.store';
import { MONSTER_KINDS, type MonsterKind } from './monsters';
import { itemMeta } from './items';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const MAX_CAMPS = 2;
const LEASH_MULT = 1.7; // give up chasing past aggroRange * this
const CHEST_POOL = ['hide', 'bone', 'cooked_meat', 'meat', 'wood', 'stone'];
let seq = 0;
let aseq = 0;
let campSeq = 0;

function makeMonster(x: number, y: number, z: number, campId: string, k: MonsterKind): Monster {
  return {
    id: `m:${Date.now().toString(36)}-${++seq}`,
    campId,
    kind: k.key, color: k.color, size: k.size, speed: k.speed, attack: k.attack,
    damage: k.damage, attackRange: k.attackRange, aggroRange: k.aggroRange, attackCooldown: k.attackCooldown,
    x, y, z, yaw: 0, hp: k.hp, maxHp: k.hp, lootKey: k.lootKey, lootQty: k.lootQty, coins: k.coins,
    nextAttackAt: 0, flashUntil: 0, lungeUntil: 0, knockX: 0, knockZ: 0, knockVY: 0, knockUntil: 0, slowUntil: 0, bubbleUntil: 0, bubbleNextTick: 0, stunUntil: 0, dead: false,
  };
}

function makeChestLoot(): { gold: number; items: ChestLoot[] } {
  const gold = 80 + Math.floor(Math.random() * 140); // 80–219 — clearing a camp pays well
  const items: ChestLoot[] = [];
  const count = 2 + Math.floor(Math.random() * 3); // 2–4 stacks
  for (let i = 0; i < count; i++) {
    const key = CHEST_POOL[Math.floor(Math.random() * CHEST_POOL.length)]!;
    items.push({ key, qty: 1 + Math.floor(Math.random() * 4) });
  }
  return { gold, items };
}

/** Spawns a camp: a melee+ranged cluster at a random far spot. Clearing it all
 *  drops a loot chest. Monsters chase when you're in range and give up if you flee. */
export function Monsters() {
  const monsters = useMonstersStore((s) => s.monsters);
  const arrows = useMonstersStore((s) => s.arrows);
  const lastSpawn = useRef(0);

  useFrame(() => {
    const now = performance.now();

    // Form new camps until we have MAX_CAMPS.
    const camps = useCampsStore.getState().camps;
    if (now - lastSpawn.current > 2500 && camps.length < MAX_CAMPS) {
      lastSpawn.current = now;
      const p = usePlayerStore.getState().position;
      const ang = Math.random() * Math.PI * 2;
      const r = 45 + Math.random() * 45;
      const cx = p.x + Math.cos(ang) * r;
      const cz = p.z + Math.sin(ang) * r;
      if (surfaceHeight(SEED, cx, cz) >= 0.6) {
        const campId = `camp:${Date.now().toString(36)}-${++campSeq}`;
        useCampsStore.getState().addCamp({ id: campId, x: cx, z: cz });
        const total = 3 + Math.floor(Math.random() * 2); // 3–4 monsters
        for (let i = 0; i < total; i++) {
          // mix of melee + ranged
          const k = MONSTER_KINDS[i % MONSTER_KINDS.length]!;
          const a = Math.random() * Math.PI * 2;
          const rr = 2 + Math.random() * 5;
          const mx = cx + Math.cos(a) * rr;
          const mz = cz + Math.sin(a) * rr;
          useMonstersStore.getState().spawn(makeMonster(mx, surfaceHeight(SEED, mx, mz), mz, campId, k));
        }
      }
    }

    // Death sweep + camp-clear → chest.
    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i]!;
      if (m.dead || m.hp > 0) continue;
      m.dead = true;
      useInventoryStore.getState().add(m.lootKey, m.lootQty);
      useProgressStore.getState().addCoins(m.coins);
      const meta = itemMeta(m.lootKey);
      useGameplayStore.getState().pushToast(`+${m.lootQty} ${meta.icon} ${meta.name} · +${m.coins}🪙`, now);
      useEffectsStore.getState().spawnBurst(m.x, m.y + m.size, m.z, m.color, now);
      useMonstersStore.getState().remove(m.id);

      // If this clears its camp, drop a chest.
      if (m.campId) {
        const remaining = useMonstersStore.getState().monsters.some((o) => o.campId === m.campId && !o.dead && o.id !== m.id);
        if (!remaining) {
          const camp = useCampsStore.getState().camps.find((c) => c.id === m.campId);
          if (camp) {
            const loot = makeChestLoot();
            useCampsStore.getState().addChest({ id: `chest:${camp.id}`, x: camp.x, y: surfaceHeight(SEED, camp.x, camp.z), z: camp.z, gold: loot.gold, items: loot.items, opened: false });
            useCampsStore.getState().removeCamp(camp.id);
            useGameplayStore.getState().pushToast('⚔️ Camp cleared — a chest appeared!', now);
          }
        }
      }
    }
  });

  return (
    <>
      {monsters.map((m) => (
        <MonsterMesh key={m.id} monster={m} />
      ))}
      {arrows.map((a) => (
        <ArrowMesh key={a.id} arrow={a} />
      ))}
    </>
  );
}

function MonsterMesh({ monster }: { monster: Monster }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const bubble = useRef<THREE.Mesh>(null);
  const base = useMemo(() => new THREE.Color(monster.color), [monster.color]);
  const flash = useMemo(() => new THREE.Color('#ffffff'), []);

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g || monster.dead) return;
    const dt = Math.min(dtRaw, 0.05);
    const now = performance.now();
    const p = usePlayerStore.getState().position;

    // Bubbled (Water Beam non-lethal) — float helpless, taking damage-over-time.
    if (now < monster.bubbleUntil) {
      const ground = surfaceHeight(SEED, monster.x, monster.z);
      monster.y += (ground + 2.4 - monster.y) * Math.min(1, dt * 4);
      if (now >= monster.bubbleNextTick) {
        monster.bubbleNextTick = now + 500;
        monster.hp -= 5;
        monster.flashUntil = now + 120;
        useDamageStore.getState().add(monster.x, monster.y + monster.size * 1.7, monster.z, 5, false, now);
      }
      g.position.set(monster.x, monster.y, monster.z);
      g.rotation.y += dt * 0.6;
      if (bubble.current) bubble.current.visible = true;
      return;
    }
    if (bubble.current) bubble.current.visible = false;

    // Stunned (lightning) — frozen in place, crackling, can't act.
    if (now < monster.stunUntil) {
      monster.y = surfaceHeight(SEED, monster.x, monster.z);
      g.position.set(monster.x, monster.y, monster.z);
      if (mat.current) {
        const flick = Math.sin(now * 0.05) > 0;
        mat.current.color.copy(base).lerp(new THREE.Color('#eaf4ff'), flick ? 0.7 : 0.2);
        mat.current.emissive.setRGB(0.1, 0.2, flick ? 0.5 : 0.2);
      }
      return;
    }

    // Knocked back (Air Bomb / Updraft) — slide + get tossed into the air.
    if (now < monster.knockUntil) {
      monster.x += monster.knockX * dt;
      monster.z += monster.knockZ * dt;
      const damp = Math.max(0, 1 - dt * 3);
      monster.knockX *= damp;
      monster.knockZ *= damp;
      monster.knockVY -= 24 * dt; // gravity for the loft
      const ground = surfaceHeight(SEED, monster.x, monster.z);
      let ny = monster.y + monster.knockVY * dt;
      if (ny <= ground) {
        ny = ground;
        monster.knockVY = 0;
      }
      monster.y = ny;
      g.position.set(monster.x, monster.y, monster.z);
      g.rotation.z = Math.sin(now * 0.02) * 0.4; // tumble
      return;
    }
    g.rotation.z = 0;

    const slowed = now < monster.slowUntil;
    const spd = slowed ? monster.speed * 0.4 : monster.speed; // soaked = sluggish
    const dx = p.x - monster.x;
    const dz = p.z - monster.z;
    const dist = Math.hypot(dx, dz) || 1;
    const engaged = dist < monster.aggroRange * LEASH_MULT;

    if (engaged) {
      monster.yaw = Math.atan2(dx, dz);
      if (monster.attack === 'melee') {
        if (dist > monster.attackRange) {
          monster.x += (dx / dist) * spd * dt;
          monster.z += (dz / dist) * spd * dt;
        } else if (now >= monster.nextAttackAt) {
          monster.nextAttackAt = now + monster.attackCooldown;
          monster.lungeUntil = now + 200;
          usePlayerStore.getState().damage(monster.damage, now, monster.x, monster.z);
        }
      } else {
        const ideal = monster.attackRange * 0.7;
        if (dist > monster.attackRange) {
          monster.x += (dx / dist) * spd * dt;
          monster.z += (dz / dist) * spd * dt;
        } else if (dist < ideal * 0.6) {
          monster.x -= (dx / dist) * spd * dt;
          monster.z -= (dz / dist) * spd * dt;
        } else if (now >= monster.nextAttackAt) {
          monster.nextAttackAt = now + monster.attackCooldown;
          shootArrow(monster, p);
        }
      }
    }
    monster.y = surfaceHeight(SEED, monster.x, monster.z);

    g.position.set(monster.x, monster.y, monster.z);
    g.rotation.y = monster.yaw;

    if (mat.current) {
      const f = now < monster.flashUntil;
      if (f) {
        mat.current.color.copy(flash);
        mat.current.emissive.setRGB(0.5, 0, 0);
      } else if (slowed) {
        mat.current.color.copy(base).lerp(new THREE.Color('#5aa0ff'), 0.5); // wet tint
        mat.current.emissive.setRGB(0, 0.05, 0.12);
      } else {
        mat.current.color.copy(base);
        mat.current.emissive.setRGB(0, 0, 0);
      }
    }
  });

  const s = monster.size;
  return (
    <group ref={group} position={[monster.x, monster.y, monster.z]}>
      {/* water bubble (shown while bubbled) */}
      <mesh ref={bubble} position={[0, s * 1.1, 0]} visible={false}>
        <sphereGeometry args={[s * 1.6, 16, 14]} />
        <meshStandardMaterial color="#7fd0ff" transparent opacity={0.32} roughness={0.1} metalness={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, s * 1.0, 0]} castShadow>
        <capsuleGeometry args={[s * 0.5, s * 1.1, 4, 10]} />
        <meshStandardMaterial ref={mat} color={monster.color} roughness={0.8} />
      </mesh>
      <mesh position={[0, s * 1.7, 0]} castShadow>
        <sphereGeometry args={[s * 0.42, 12, 10]} />
        <meshStandardMaterial color={monster.color} roughness={0.8} />
      </mesh>
      {/* tiny health pip above the head */}
      <mesh position={[0, s * 2.2, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.02]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
}

function shootArrow(m: Monster, target: { x: number; y: number; z: number }) {
  const ox = m.x;
  const oy = m.y + m.size * 1.4;
  const oz = m.z;
  const dx = target.x - ox;
  const dy = target.y + 1.2 - oy;
  const dz = target.z - oz;
  const len = Math.hypot(dx, dy, dz) || 1;
  const spd = 26;
  useMonstersStore.getState().addArrow({
    id: `ar:${Date.now().toString(36)}-${++aseq}`,
    x: ox, y: oy, z: oz,
    vx: (dx / len) * spd, vy: (dy / len) * spd, vz: (dz / len) * spd,
    damage: m.damage, bornAt: performance.now(),
  });
}

function ArrowMesh({ arrow }: { arrow: Arrow }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dtRaw) => {
    if (!ref.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const now = performance.now();
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    arrow.z += arrow.vz * dt;
    ref.current.position.set(arrow.x, arrow.y, arrow.z);

    const p = usePlayerStore.getState().position;
    const d2 = (p.x - arrow.x) ** 2 + (p.y - arrow.y) ** 2 + (p.z - arrow.z) ** 2;
    if (d2 < 1.1) {
      // source ≈ where the arrow came from (a step back along its flight)
      usePlayerStore.getState().damage(arrow.damage, now, arrow.x - arrow.vx, arrow.z - arrow.vz);
      useMonstersStore.getState().removeArrow(arrow.id);
      return;
    }
    if (arrow.y <= surfaceHeight(SEED, arrow.x, arrow.z) || now - arrow.bornAt > 4000) {
      useMonstersStore.getState().removeArrow(arrow.id);
    }
  });
  return (
    <mesh ref={ref} position={[arrow.x, arrow.y, arrow.z]}>
      <boxGeometry args={[0.06, 0.06, 0.6]} />
      <meshStandardMaterial color="#3a2a16" />
    </mesh>
  );
}
