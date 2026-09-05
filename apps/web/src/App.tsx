import { Suspense, lazy, useEffect, useMemo } from 'react';
import { useReducedMotion, useScroll, useMotionValueEvent } from 'motion/react';
import { CHAPTERS } from './content/chapters';
import { galaxyTargetsFor, DEFAULT_TARGETS } from './lib/galaxyTargets';
import { paletteRGB, rgbHex } from './lib/palettes';
import { useStory } from './store/story';
import { globalProgress } from './store/motion';
import { transmission } from './lib/audio/transmission';
import Chapter from './components/story/Chapter';
import Stage from './components/story/Stage';
import StationHUD from './components/hud/StationHUD';
import FrameChrome from './components/hud/FrameChrome';
import GrainOverlay from './components/hud/GrainOverlay';
import RecordIndex from './components/hud/RecordIndex';
import TransmissionToggle from './components/hud/TransmissionToggle';

/**
 * The report.
 *
 * Layer order, back to front:
 *   L0  GalaxyField   fixed, one WebGL context, mounted once
 *   L1  per-record canvas objects (station, planet, debris)
 *   L2  the orbital trace
 *   L3  copy, then HUD / frame / grain
 *
 * The shader is lazily imported so ogl stays out of the entry chunk; the
 * void background means there is nothing to see while it arrives.
 */

const GalaxyField = lazy(() => import('./components/space/GalaxyField'));
const TaskConsole = lazy(() => import('./components/campaign/TaskConsole'));

export default function App() {
  const prefersReduced = useReducedMotion() ?? false;
  const activeIndex = useStory((s) => s.active);
  const spectral = useStory((s) => s.spectral);
  const setReducedMotion = useStory((s) => s.setReducedMotion);

  useEffect(() => {
    setReducedMotion(prefersReduced);
  }, [prefersReduced, setReducedMotion]);

  // Document-level progress, for anything that needs the whole arc.
  const { scrollYProgress } = useScroll();
  useMotionValueEvent(scrollYProgress, 'change', (p) => globalProgress.set(p));

  // Sky tuning follows the active record.
  const targets = useMemo(() => {
    const chapter = CHAPTERS[activeIndex];
    return chapter ? galaxyTargetsFor(chapter) : DEFAULT_TARGETS;
  }, [activeIndex]);

  // The signal colour is a CSS custom property written imperatively, so
  // every DOM layer can reference it without re-rendering on change.
  useEffect(() => {
    const rgb = spectral ? paletteRGB(spectral) : ([235, 245, 255] as const);
    const root = document.documentElement;
    root.style.setProperty('--signal', rgbHex(rgb));
    root.style.setProperty('--signal-rgb', `${rgb[0]} ${rgb[1]} ${rgb[2]}`);
  }, [spectral]);

  // Narration follows the active record. The engine no-ops unless the
  // reader has opened the channel, and refuses to repeat a record it has
  // already read, so scrolling back and forth does not stutter.
  useEffect(() => {
    const chapter = CHAPTERS[activeIndex];
    if (!chapter?.lines.length) return;
    void transmission.speak({ id: chapter.id, lines: chapter.lines });
  }, [activeIndex]);

  return (
    <>
      {/* ── L0: the deep field ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[#04050a]"
      >
        <Suspense fallback={null}>
          <GalaxyField
            targets={targets}
            frozen={prefersReduced}
            mouseInteraction={!prefersReduced}
            className="size-full"
          />
        </Suspense>
      </div>

      <a
        href="#rec-01"
        className="log sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:border focus:border-white/30 focus:bg-black focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to the report
      </a>

      {/* ── the records ── */}
      <main className="relative z-10">
        <h1 className="sr-only">
          Resonance — recovered log, relay station KX-19
        </h1>
        {CHAPTERS.map((chapter, i) => (
          <Chapter key={chapter.id} chapter={chapter} index={i}>
            <Stage />
          </Chapter>
        ))}

       
      </main>

      <Suspense fallback={null}>
        <TaskConsole />
      </Suspense>

      {/* ── L3: instrument chrome ── */}
      <FrameChrome />
      <RecordIndex />
      <StationHUD />
      <TransmissionToggle />
      <GrainOverlay />
    </>
  );
}
