import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useScroll, useMotionValueEvent } from 'motion/react';
import type { Chapter as ChapterData } from '../../content/chapters';
import { ChapterContext } from './chapterContext';
import { chapterProgress, signalStrength } from '../../store/motion';
import { useStory } from '../../store/story';
import { transmission } from '../../lib/audio/transmission';

interface Props {
  chapter: ChapterData;
  index: number;
  children: ReactNode;
}

/**
 * The one primitive the whole story is built from.
 *
 * A tall <section> containing a viewport-height sticky stage. Scrolling
 * the section's height drives `progress` 0..1 while the stage stays
 * pinned. This is native `position: sticky` rather than a pinning
 * library on purpose:
 *
 *   - the native scrollbar keeps working, and keeps reporting real length
 *   - no transform is applied to the scroll container, so no layout thrash
 *   - nothing intercepts wheel or touch, so the page never fights the user
 *   - it degrades to a plain readable document with CSS disabled
 *
 * The cost is that we cannot exceed one viewport of pinned stage, which
 * this design never needs.
 */
export default function Chapter({ chapter, index, children }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const setActive = useStory((s) => s.setActive);

  const { scrollYProgress } = useScroll({
    target: ref,
    // 'start start' -> the moment the stage pins
    // 'end end'     -> the moment it releases
    offset: ['start start', 'end end'],
  });

  // Publish this record's progress and derived signal strength to the
  // global MotionValues whenever it is the pinned record. Writing on
  // change (not on render) is what keeps the HUD off React's render path.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pinned = rect.top <= 1 && rect.bottom > window.innerHeight * 0.5;
    if (!pinned) return;

    chapterProgress.set(p);
    const [from, to] = chapter.signal;
    const signal = from + (to - from) * p;
    signalStrength.set(signal);
    // Couple the noise bed to reported signal strength, so REC 06 sounds
    // like an empty channel rather than a quiet one.
    transmission.setAtmosphere(signal);

    setActive({
      active: index,
      activeId: chapter.id,
      activeTitle: chapter.title,
      activeMET: chapter.met,
      activePlate: chapter.plate,
      spectral: chapter.spectral,
    });
  });

  // First record must claim the HUD before any scroll has happened.
  useEffect(() => {
    if (index !== 0) return;
    setActive({
      active: 0,
      activeId: chapter.id,
      activeTitle: chapter.title,
      activeMET: chapter.met,
      activePlate: chapter.plate,
      spectral: chapter.spectral,
    });
  }, [index, chapter, setActive]);

  const ctx = useMemo(
    () => ({ chapter, index, progress: scrollYProgress, isActive: true }),
    [chapter, index, scrollYProgress],
  );

  return (
    <section
      ref={ref}
      id={chapter.id}
      aria-labelledby={`${chapter.id}-title`}
      data-rec={chapter.rec ?? 'cold-open'}
      style={{ height: `${chapter.beats * 100}svh` }}
      className="relative"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <ChapterContext.Provider value={ctx}>{children}</ChapterContext.Provider>
      </div>
    </section>
  );
}
