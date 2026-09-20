import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressState {
  coins: number;
  /** learned skill/spell keys */
  learned: Record<string, true>;
  addCoins: (n: number) => void;
  spend: (n: number) => boolean; // returns false if not enough
  learn: (key: string) => void;
  hasLearned: (key: string) => boolean;
}

/** Client-side economy + learned skills/spells, persisted to localStorage so a
 *  page reload doesn't wipe your coins and purchased spells. (Server-side
 *  persistence is the next step.) */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      coins: 50, // a small starter purse
      learned: {},
      addCoins: (n) => set((s) => ({ coins: s.coins + n })),
      spend: (n) => {
        if (get().coins < n) return false;
        set((s) => ({ coins: s.coins - n }));
        return true;
      },
      learn: (key) => set((s) => ({ learned: { ...s.learned, [key]: true } })),
      hasLearned: (key) => !!get().learned[key],
    }),
    { name: 'eworld-progress', partialize: (s) => ({ coins: s.coins, learned: s.learned }) },
  ),
);
