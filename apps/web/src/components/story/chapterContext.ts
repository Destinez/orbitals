import { createContext, useContext } from 'react';
import { motionValue, type MotionValue } from 'motion/react';
import type { Chapter } from '../../content/chapters';

export interface ChapterCtx {
  chapter: Chapter;
  index: number;
  /** progress through this record, 0..1 */
  progress: MotionValue<number>;
  /** true while this record is the pinned one */
  isActive: boolean;
}

const fallbackProgress = motionValue(0);

export const ChapterContext = createContext<ChapterCtx | null>(null);

export function useChapter(): ChapterCtx {
  const ctx = useContext(ChapterContext);
  if (ctx) return ctx;
  // Components are allowed to render outside a Chapter (e.g. in isolation
  // for visual checks); they simply see a parked progress value.
  throw new Error('useChapter must be used inside a <Chapter>');
}

export function useChapterProgress(): MotionValue<number> {
  return useContext(ChapterContext)?.progress ?? fallbackProgress;
}
