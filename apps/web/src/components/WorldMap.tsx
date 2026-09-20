'use client';
import { useEffect, useRef } from 'react';
import { sampleTerrain } from '@eworld/game-core';
import { Biome } from '@eworld/shared';
import { usePlayerStore } from '@/store/player.store';
import { useUiStore } from '@/store/ui.store';
import { NPCS } from '@/game/npcs';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const PX = 520; // canvas size
const RANGE = 320; // meters half-extent shown
const GRID = 160; // sample resolution

function biomeRGB(b: Biome, h: number): string {
  switch (b) {
    case Biome.Ocean: return '#1f4f7a';
    case Biome.Beach: return '#cdbb87';
    case Biome.Desert: return '#c9a86a';
    case Biome.Snow: return '#e8edf4';
    case Biome.Mountain: return '#6b6760';
    case Biome.Swamp: return '#3c4632';
    default: {
      const t = Math.max(0, Math.min(1, h / 130));
      return `rgb(${40 + Math.round(t * 60)},${Math.round(120 - t * 50)},50)`;
    }
  }
}

/** Full-screen explorable map (press M). North-up, centered on the player. */
export function WorldMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { position } = usePlayerStore.getState();
    const px = position.x;
    const pz = position.z;

    const cell = PX / GRID;
    const step = (RANGE * 2) / GRID;
    for (let gx = 0; gx < GRID; gx++) {
      for (let gz = 0; gz < GRID; gz++) {
        const s = sampleTerrain(SEED, px + (gx - GRID / 2) * step, pz + (gz - GRID / 2) * step);
        ctx.fillStyle = biomeRGB(s.biome, s.height);
        ctx.fillRect(gx * cell, gz * cell, cell + 1, cell + 1);
      }
    }

    // NPC markers
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    for (const n of NPCS) {
      const sx = PX / 2 + ((n.x - px) / RANGE) * (PX / 2);
      const sz = PX / 2 + ((n.z - pz) / RANGE) * (PX / 2);
      if (sx < 0 || sx > PX || sz < 0 || sz > PX) continue;
      ctx.fillStyle = '#ffd64a';
      ctx.beginPath();
      ctx.arc(sx, sz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(n.name, sx, sz - 8);
    }

    // Player marker
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.arc(PX / 2, PX / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, []);

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/60">
      <div className="glass rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">World Map</h2>
          <button
            onClick={() => useUiStore.getState().close()}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            Close ✕
          </button>
        </div>
        <canvas ref={canvasRef} width={PX} height={PX} className="rounded-2xl" />
        <p className="mt-2 text-center text-xs text-white/50">Press M or Esc to close</p>
      </div>
    </div>
  );
}
