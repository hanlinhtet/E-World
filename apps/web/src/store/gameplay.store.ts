import { create } from 'zustand';
import type { HarvestAction } from '@eworld/game-core';

export interface HarvestTarget {
  id: string;
  label: string;
  yieldKey: string;
  /** 0..1 progress toward breaking (hits / hp) */
  progress: number;
}

export interface Toast {
  id: number;
  text: string;
}

interface GameplayState {
  /** the node currently under the crosshair and in range, or null */
  target: HarvestTarget | null;
  /** timestamp (ms) the current swing started + how it should animate */
  swingStart: number;
  swingUntil: number;
  swingAction: HarvestAction;
  toasts: Toast[];
  setTarget: (target: HarvestTarget | null) => void;
  triggerSwing: (action: HarvestAction, durationMs: number, now: number) => void;
  pushToast: (text: string, now: number) => void;
  expireToasts: (now: number) => void;
}

export const useGameplayStore = create<GameplayState>((set) => ({
  target: null,
  swingStart: 0,
  swingUntil: 0,
  swingAction: 'chop',
  toasts: [],
  setTarget: (target) =>
    set((s) => {
      const a = s.target;
      if (a && target && a.id === target.id && a.progress === target.progress) return s;
      if (!a && !target) return s;
      return { target };
    }),
  triggerSwing: (action, durationMs, now) =>
    set({ swingAction: action, swingStart: now, swingUntil: now + durationMs }),
  pushToast: (text, now) =>
    set((s) => ({ toasts: [...s.toasts, { id: now + s.toasts.length, text }].slice(-4) })),
  expireToasts: (now) =>
    set((s) => (s.toasts.length ? { toasts: s.toasts.filter((t) => now - t.id < 1600) } : s)),
}));
