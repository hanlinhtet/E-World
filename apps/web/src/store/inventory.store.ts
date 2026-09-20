import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InventoryState {
  /** itemKey → quantity */
  items: Record<string, number>;
  add: (key: string, qty: number) => void;
  /** remove up to qty; returns true if it had enough */
  remove: (key: string, qty: number) => boolean;
  has: (key: string, qty: number) => boolean;
  count: (key: string) => number;
}

/**
 * Client-side inventory for the gathering + crafting loop, persisted to
 * localStorage so a reload keeps your items. Server sync is the next step.
 */
export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (key, qty) => set((s) => ({ items: { ...s.items, [key]: (s.items[key] ?? 0) + qty } })),
      has: (key, qty) => (get().items[key] ?? 0) >= qty,
      count: (key) => get().items[key] ?? 0,
      remove: (key, qty) => {
        const cur = get().items[key] ?? 0;
        if (cur < qty) return false;
        set((s) => ({ items: { ...s.items, [key]: cur - qty } }));
        return true;
      },
    }),
    { name: 'eworld-inventory', partialize: (s) => ({ items: s.items }) },
  ),
);
