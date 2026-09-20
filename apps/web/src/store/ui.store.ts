import { create } from 'zustand';

export type Panel = 'none' | 'map' | 'inventory' | 'shop';

interface UiState {
  panel: Panel;
  activeNpcId: string | null;
  /** the NPC currently in talk range (for the "[E] Talk" prompt), or null */
  nearNpcId: string | null;
  open: (panel: Panel, npcId?: string) => void;
  close: () => void;
  toggle: (panel: Panel) => void;
  setNearNpc: (id: string | null) => void;
}

/** Which full-screen UI panel (if any) is open. When not 'none', the pointer is
 *  unlocked and gameplay input is suppressed. */
export const useUiStore = create<UiState>((set, get) => ({
  panel: 'none',
  activeNpcId: null,
  nearNpcId: null,
  open: (panel, npcId) => set({ panel, activeNpcId: npcId ?? null }),
  close: () => set({ panel: 'none', activeNpcId: null }),
  toggle: (panel) => set(get().panel === panel ? { panel: 'none', activeNpcId: null } : { panel }),
  setNearNpc: (id) => set((s) => (s.nearNpcId === id ? s : { nearNpcId: id })),
}));
