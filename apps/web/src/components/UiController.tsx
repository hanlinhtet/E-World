'use client';
import { useEffect } from 'react';
import { useUiStore } from '@/store/ui.store';

/** Browser enforces a ~1.25s lock-out after exiting pointer lock. */
const RELOCK_COOLDOWN = 1300;

/**
 * Global UI keybinds + pointer-lock management.
 *  M = world map · I = inventory/crafting · Esc = close.
 *
 * While any panel is open the pointer must stay UNLOCKED so the cursor is
 * visible and can click UI. We (a) exit on open, (b) force-exit again if the
 * lock ever re-engages while a panel is open, and (c) block the canvas clicks
 * drei uses to re-lock — both during a panel and during the browser's post-exit
 * cooldown (which otherwise throws a SecurityError).
 */
export function UiController() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        e.preventDefault();
        useUiStore.getState().toggle('map');
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        useUiStore.getState().toggle('inventory');
      } else if (e.code === 'Escape') {
        useUiStore.getState().close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let relockReadyAt = 0;

    const onLockChange = () => {
      const panelOpen = useUiStore.getState().panel !== 'none';
      if (!document.pointerLockElement) {
        relockReadyAt = performance.now() + RELOCK_COOLDOWN;
      } else if (panelOpen) {
        // A panel is open but the pointer locked anyway — release it immediately.
        try {
          document.exitPointerLock();
        } catch {
          /* ignore */
        }
      }
    };

    const blockEarlyRelock = (e: Event) => {
      const el = e.target as HTMLElement | null;
      const panelOpen = useUiStore.getState().panel !== 'none';
      if (el?.tagName === 'CANVAS' && (panelOpen || performance.now() < relockReadyAt)) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const onRej = (e: PromiseRejectionEvent) => {
      const r = e.reason as { name?: string; message?: string } | undefined;
      if (r?.name === 'SecurityError' || /pointer lock/i.test(r?.message ?? '')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('pointerdown', blockEarlyRelock, true);
    window.addEventListener('click', blockEarlyRelock, true);
    window.addEventListener('unhandledrejection', onRej, true);
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('pointerdown', blockEarlyRelock, true);
      window.removeEventListener('click', blockEarlyRelock, true);
      window.removeEventListener('unhandledrejection', onRej, true);
    };
  }, []);

  // Free the cursor whenever a panel is open (retry across a few frames in case
  // the lock engaged at the same moment the panel opened).
  const panel = useUiStore((s) => s.panel);
  useEffect(() => {
    if (panel === 'none') return;
    const tryExit = () => {
      try {
        if (document.pointerLockElement) document.exitPointerLock();
      } catch {
        /* ignore */
      }
    };
    tryExit();
    const raf = requestAnimationFrame(tryExit);
    const timer = window.setTimeout(tryExit, 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [panel]);

  return null;
}
