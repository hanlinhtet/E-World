'use client';
import { useEffect, useRef } from 'react';
import { sampleTerrain, harvestablesNear } from '@eworld/game-core';
import { Biome } from '@eworld/shared';
import { usePlayerStore } from '@/store/player.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const SIZE = 152; // px
const RANGE = 90; // meters from edge to edge of the visible disc (half-extent)
const GRID = 38; // terrain sample resolution
const REDRAW_MS = 140; // throttle the heavy terrain pass

function biomeRGB(b: Biome, height: number): string {
  switch (b) {
    case Biome.Ocean:
      return '#1f4f7a';
    case Biome.Beach:
      return '#cdbb87';
    case Biome.Desert:
      return '#c9a86a';
    case Biome.Snow:
      return '#e8edf4';
    case Biome.Mountain:
      return '#6b6760';
    case Biome.Swamp:
      return '#3c4632';
    default: {
      const t = Math.max(0, Math.min(1, height / 130));
      const g = Math.round(120 - t * 50);
      return `rgb(${40 + Math.round(t * 60)},${g},${50})`;
    }
  }
}

/** Top-down circular minimap that follows the player (north-up). */
export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDraw = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - lastDraw.current < REDRAW_MS) return;
      lastDraw.current = now;

      const { position, look } = usePlayerStore.getState();
      const px = position.x;
      const pz = position.z;

      ctx.save();
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      // Terrain
      const cell = SIZE / GRID;
      const step = (RANGE * 2) / GRID;
      for (let gx = 0; gx < GRID; gx++) {
        for (let gz = 0; gz < GRID; gz++) {
          const wx = px + (gx - GRID / 2) * step;
          const wz = pz + (gz - GRID / 2) * step;
          const s = sampleTerrain(SEED, wx, wz);
          ctx.fillStyle = biomeRGB(s.biome, s.height);
          ctx.fillRect(gx * cell, gz * cell, cell + 1, cell + 1);
        }
      }

      // Nearby harvestable nodes as dots
      const nodes = harvestablesNear(SEED, px, pz);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const sx = SIZE / 2 + ((n.wx - px) / RANGE) * (SIZE / 2);
        const sz = SIZE / 2 + ((n.wz - pz) / RANGE) * (SIZE / 2);
        if (sx < 0 || sx > SIZE || sz < 0 || sz > SIZE) continue;
        ctx.fillStyle = n.kind === 'tree' ? '#2f7d32' : n.kind === 'bush' ? '#5a9e3a' : '#b9bcc2';
        ctx.fillRect(sx - 1, sz - 1, 2.5, 2.5);
      }

      // Player arrow at center, pointing along heading (dir = sin yaw, cos yaw)
      const dirX = Math.sin(look.yaw);
      const dirZ = Math.cos(look.yaw);
      const cxp = SIZE / 2;
      const czp = SIZE / 2;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cxp + dirX * 7, czp + dirZ * 7);
      ctx.lineTo(cxp - dirZ * 4 - dirX * 4, czp + dirX * 4 - dirZ * 4);
      ctx.lineTo(cxp + dirZ * 4 - dirX * 4, czp - dirX * 4 - dirZ * 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="glass pointer-events-none fixed bottom-4 left-4 overflow-hidden rounded-full"
      style={{ width: SIZE, height: SIZE }}
    >
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="block" />
      <div className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[10px] font-semibold text-white/80">
        N
      </div>
    </div>
  );
}
