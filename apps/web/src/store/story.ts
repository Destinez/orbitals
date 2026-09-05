import { create } from 'zustand';
import type { AnyPaletteName } from '../lib/palettes';

/**
 * Discrete story state only.
 *
 * Continuous values (scroll progress, signal strength) deliberately do
 * NOT live here — they stay as MotionValues that canvases and the HUD
 * subscribe to imperatively, so a 60fps meter never re-renders the tree.
 * This store changes a handful of times over the whole scroll.
 */

export interface StoryState {
  /** index into CHAPTERS */
  active: number;
  activeId: string;
  activeTitle: string;
  /** canonical MET for the active record, DD:HH:MM:SS */
  activeMET: string;
  /** plate number shown in the HUD */
  activePlate: string | null;
  spectral: AnyPaletteName | null;
  /** true once the cold-open boot sequence has finished */
  booted: boolean;
  reducedMotion: boolean;

  setActive: (
    v: Pick<
      StoryState,
      'active' | 'activeId' | 'activeTitle' | 'activeMET' | 'activePlate' | 'spectral'
    >,
  ) => void;
  setBooted: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
}

export const useStory = create<StoryState>((set) => ({
  active: 0,
  activeId: 'rec-00',
  activeTitle: 'COLD OPEN',
  activeMET: '00:00:00:00',
  activePlate: null,
  spectral: null,
  booted: false,
  reducedMotion: false,

  setActive: (v) =>
    set((prev) =>
      prev.active === v.active && prev.activeId === v.activeId ? prev : { ...prev, ...v },
    ),
  setBooted: (booted) => set({ booted }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
