'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { surfaceHeight, collidersNear } from '@eworld/game-core';
import { GRAVITY, JUMP_VELOCITY, MOVE_SPEED } from '@eworld/shared';
import { usePlayerStore } from '@/store/player.store';
import { useUiStore } from '@/store/ui.store';
import { useProgressStore } from '@/store/progress.store';
import { useNodeStateStore } from '@/store/nodeState.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const EYE_HEIGHT = 1.7;
/** Player's horizontal collision radius (used against tree trunks). */
const PLAYER_RADIUS = 0.35;
/** Max rise the player can step up / snap to in one frame (stairs, ledges, rock edges). */
const STEP_HEIGHT = 0.6;
/** How long a jump press stays "buffered" so a tap isn't lost between frames. */
const JUMP_BUFFER = 0.15;
/** Grace window after leaving the ground where a jump still counts (coyote time). */
const COYOTE_TIME = 0.1;
/** Fraction of full speed retained for steering while airborne. */
const AIR_CONTROL = 0.7;

// ── Learnable movement skills ────────────────────────────────────────────
const DASH_SPEED = 24; // m/s burst
const DASH_TIME = 170; // ms
const DASH_COOLDOWN = 1100; // ms
const DOUBLE_TAP_MS = 280; // window to register a double-tap dash
const GLIDE_FALL_SPEED = 2; // capped descent (m/s) while gliding
const DASH_DIRS: Record<string, 'f' | 'b' | 'l' | 'r'> = {
  KeyW: 'f',
  KeyS: 'b',
  KeyA: 'l',
  KeyD: 'r',
};

/**
 * First-person controller with client-side prediction.
 *
 * Horizontal movement (WASD) and vertical movement (jump/gravity) are integrated
 * independently every frame, so you keep moving while airborne — walk + jump work
 * together. Jump is edge-triggered and buffered, with coyote time, so a tap always
 * registers regardless of frame rate. Network reconciliation is wired in Phase 2.
 */
export function FpsController() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocityY = useRef(0);
  const pos = useRef(new THREE.Vector3(0, 80, 0));
  const jumpBuffer = useRef(0); // seconds remaining where a queued jump is valid
  const timeSinceGrounded = useRef(0); // seconds since we were last on the ground
  const jumpCount = useRef(0); // jumps used since last grounded (for double jump)
  const dashUntil = useRef(0); // ms timestamp dash impulse ends
  const dashCooldownUntil = useRef(0);
  const dashDir = useRef<'f' | 'b' | 'l' | 'r'>('f');
  const lastTap = useRef<Record<string, number>>({});

  // Reusable vectors so we don't allocate every frame (hot path).
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());
  const extVel = useRef(new THREE.Vector3()); // external horizontal knockback velocity (decays)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (useUiStore.getState().panel !== 'none') return;

      // Jump only on the initial press (not key-repeat) so HOLDING Space glides.
      if (e.code === 'Space') {
        if (!e.repeat) jumpBuffer.current = JUMP_BUFFER;
        e.preventDefault();
        return;
      }

      // Dash: double-tap a movement key (requires the Dash skill).
      const dir = DASH_DIRS[e.code];
      if (dir && !e.repeat && useProgressStore.getState().learned['dash']) {
        const now = performance.now();
        if (now > dashCooldownUntil.current && now - (lastTap.current[e.code] ?? 0) < DOUBLE_TAP_MS) {
          dashDir.current = dir;
          dashUntil.current = now + DASH_TIME;
          dashCooldownUntil.current = now + DASH_COOLDOWN;
        }
        lastTap.current[e.code] = now;
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // clamp huge frames (tab refocus, etc.)
    const k = keys.current;

    // ── Horizontal movement, relative to where the camera looks ──────────
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    move.current.set(0, 0, 0);
    const uiOpen = useUiStore.getState().panel !== 'none';
    if (!uiOpen) {
      if (k['KeyW']) move.current.add(forward.current);
      if (k['KeyS']) move.current.sub(forward.current);
      if (k['KeyD']) move.current.add(right.current);
      if (k['KeyA']) move.current.sub(right.current);
    }

    const grounded = timeSinceGrounded.current <= 0.0001;
    const sprinting = (k['ShiftLeft'] || k['ShiftRight']) && grounded;
    const crouching = (k['ControlLeft'] || k['KeyC']) && grounded;
    let speed = sprinting ? MOVE_SPEED.sprint : crouching ? MOVE_SPEED.crouch : MOVE_SPEED.walk;
    if (!grounded) speed *= AIR_CONTROL; // reduced steering while airborne

    if (move.current.lengthSq() > 0) {
      move.current.normalize().multiplyScalar(speed * dt);
      pos.current.x += move.current.x;
      pos.current.z += move.current.z;
    }

    // ── Knockback impulse (e.g. Air Bomb): launch up + shove horizontally ──
    const kb = usePlayerStore.getState().knock;
    if (kb.x !== 0 || kb.y !== 0 || kb.z !== 0) {
      velocityY.current += kb.y;
      extVel.current.x += kb.x;
      extVel.current.z += kb.z;
      kb.x = 0;
      kb.y = 0;
      kb.z = 0;
    }
    // Apply + decay the horizontal knockback velocity.
    if (extVel.current.lengthSq() > 0.0001) {
      pos.current.x += extVel.current.x * dt;
      pos.current.z += extVel.current.z * dt;
      const damp = Math.max(0, 1 - dt * 3.5);
      extVel.current.x *= damp;
      extVel.current.z *= damp;
    }

    // ── Dash: a quick directional burst (learned skill) ─────────────────
    const nowMs = performance.now();
    if (nowMs < dashUntil.current) {
      const f = forward.current;
      const r = right.current;
      let dvx = 0;
      let dvz = 0;
      if (dashDir.current === 'f') (dvx += f.x), (dvz += f.z);
      else if (dashDir.current === 'b') (dvx -= f.x), (dvz -= f.z);
      else if (dashDir.current === 'r') (dvx += r.x), (dvz += r.z);
      else (dvx -= r.x), (dvz -= r.z);
      pos.current.x += dvx * DASH_SPEED * dt;
      pos.current.z += dvz * DASH_SPEED * dt;
    }

    // ── Collision: push out of any solid (tree trunk or boulder) ─────────
    const solids = collidersNear(SEED, pos.current.x, pos.current.z);
    for (let i = 0; i < solids.length; i++) {
      const tr = solids[i]!;
      const dx = pos.current.x - tr.wx;
      const dz = pos.current.z - tr.wz;
      const minD = tr.collideR + PLAYER_RADIUS;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD * minD) {
        const d = Math.sqrt(d2);
        if (d > 1e-4) {
          const push = (minD - d) / d;
          pos.current.x += dx * push;
          pos.current.z += dz * push;
        } else {
          pos.current.x += minD; // dead-center: shove out arbitrarily
        }
      }
    }

    // ── Vertical movement: gravity, glide, ground snap, jump/double-jump ──
    const learned = useProgressStore.getState().learned;
    jumpBuffer.current = Math.max(0, jumpBuffer.current - dt);

    velocityY.current -= GRAVITY * dt;

    // Glide: holding Space while falling caps your descent (learned skill).
    const airborne = timeSinceGrounded.current > COYOTE_TIME;
    if (!uiOpen && learned['glide'] && airborne && k['Space'] && velocityY.current < -GLIDE_FALL_SPEED) {
      velocityY.current = -GLIDE_FALL_SPEED;
    }

    pos.current.y += velocityY.current * dt;

    const broken = useNodeStateStore.getState().broken;
    const targetEyeY = surfaceHeight(SEED, pos.current.x, pos.current.z, (id) => !!broken[id]) + EYE_HEIGHT;
    let onGround = false;
    if (velocityY.current <= 0 && pos.current.y <= targetEyeY + STEP_HEIGHT) {
      pos.current.y = targetEyeY;
      velocityY.current = 0;
      onGround = true;
      jumpCount.current = 0; // reset air jumps on landing
    }
    timeSinceGrounded.current = onGround ? 0 : timeSinceGrounded.current + dt;

    // Jump (buffered). First jump from the ground/coyote; extra mid-air jumps if
    // the Double Jump skill is learned (max 2 total).
    if (jumpBuffer.current > 0) {
      const maxJumps = learned['double_jump'] ? 2 : 1;
      const fromGround = timeSinceGrounded.current <= COYOTE_TIME && jumpCount.current === 0;
      if (fromGround) {
        velocityY.current = JUMP_VELOCITY;
        jumpBuffer.current = 0;
        jumpCount.current = 1;
        timeSinceGrounded.current = COYOTE_TIME + 1;
      } else if (jumpCount.current < maxJumps) {
        velocityY.current = JUMP_VELOCITY;
        jumpBuffer.current = 0;
        jumpCount.current += 1;
      }
    }

    camera.position.copy(pos.current);

    // Publish to the store for the HUD (without forcing per-frame re-renders).
    const store = usePlayerStore.getState();
    store.position.x = pos.current.x;
    store.position.y = pos.current.y;
    store.position.z = pos.current.z;
    // Heading for the minimap: dir = (sin yaw, cos yaw).
    store.look.yaw = Math.atan2(forward.current.x, forward.current.z);
    if (store.grounded !== onGround) store.setGrounded(onGround);
  });

  return <PointerLockControls makeDefault />;
}
