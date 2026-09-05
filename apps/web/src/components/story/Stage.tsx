import { useRef } from 'react';
import { useInView, useTransform, motion, type MotionValue } from 'motion/react';
import { useChapter } from './chapterContext';
import { inkForChapter } from '../../lib/galaxyTargets';
import RecordCopy from './RecordCopy';
import BootSequence from './BootSequence';
import ArchiveStrip from './ArchiveStrip';
import StageLayout, { type LayoutKind } from './StageLayout';
import OrbitalTrace from '../space/OrbitalTrace';
import StationSchematic from '../space/StationSchematic';
import Planet from '../space/Planet';
import AsteroidBelt from '../space/AsteroidBelt';
import ProgressivePlate from '../space/ProgressivePlate';
import type { StageKind } from '../../content/chapters';

/**
 * Mounts the layers for one record and gates them on visibility.
 *
 * `active` comes from an IntersectionObserver with generous margin, so a
 * record two screens away costs zero animation frames. Without this, eight
 * canvases and a shader all run for the entire read-through.
 */

const LAYOUT: Record<StageKind, LayoutKind> = {
  boot: 'document',
  station: 'split',
  field: 'split',
  transit: 'split',
  trace: 'split',
  lock: 'split',
  lost: 'stacked-center',
  archive: 'document',
};

// Selected records reverse the usual bearing: art left, observation right.
const ART_ON_LEFT = new Set(['rec-02', 'rec-04']);

export default function Stage() {
  const { chapter, progress } = useChapter();
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: '40% 0px 40% 0px' });
  const pinned = useInView(ref, { margin: '-35% 0px -35% 0px' });
  const ink = inkForChapter(chapter) as [number, number, number];

  // ── derived timings ──

  // The plot draws across the middle of the record: copy lands first, and
  // the figure is complete before the record releases.
  const tracePlot = useTransform(progress, [0.12, 0.86], [0, 1], { clamp: true });

  // The predicted position resolves fast, then holds. The hold is the point.
  const lockPlot = useTransform(progress, [0.08, 0.52], [0, 1], { clamp: true });
  const lockFlash = useTransform(progress, [0.46, 0.56, 0.74], [0, 1, 0.5]);

  // Below five sigma: the fragment resolves, holds, then the frame empties.
  const lostPlot = useTransform(progress, [0.06, 0.32], [0, 1], { clamp: true });
  const lostOpacity = useTransform(progress, [0.28, 0.4, 0.62, 0.88], [1, 1, 1, 0]);

  // A first partial figure at the end of OBJECT 0417, so REC 04 does not
  // arrive from nowhere.
  const hintPlot = useTransform(progress, [0.55, 1], [0, 0.18], { clamp: true });
  const hintOpacity = useTransform(progress, [0.55, 0.75], [0, 0.55]);
  const fieldPlot = useTransform(progress, [0.12, 0.86], [0, 1], { clamp: true });

  if (chapter.stage === 'boot') {
    return (
      <div ref={ref} className="absolute inset-0">
        <BootSequence progress={progress} />
      </div>
    );
  }

  const copy = (
    <RecordCopy chapter={chapter} progress={progress} active={pinned} />
  );

  const art = (() => {
    switch (chapter.stage) {
      case 'station':
        return <StationSchematic progress={progress} ink={ink} active={inView} />;

      case 'field':
        return (
          <>
            <AbsFill>
              <AsteroidBelt progress={progress} ink={ink} count={90} active={inView} />
            </AbsFill>
            <AbsFill>
              <ProgressivePlate
                seed="2"
                colorSeed="21"
                progress={fieldPlot}
                active={inView}
              />
            </AbsFill>
          </>
        );

      case 'transit':
        return (
          <>
            <AbsFill>
              <AsteroidBelt
                progress={progress}
                ink={ink}
                count={130}
                active={inView}
              />
            </AbsFill>
            <AbsFill>
              <Planet
                progress={progress}
                ink={ink}
                y={0.44}
                scale={0.22}
                phase={0.66}
                name={`OBJECT ${chapter.plate ?? '0417'}`}
                active={inView}
              />
            </AbsFill>
            <AbsFill style={{ opacity: hintOpacity }}>
              <OrbitalTrace
                seed="10"
                progress={hintPlot}
                active={inView}
                rotate={false}
              />
            </AbsFill>
          </>
        );

      case 'trace':
        return (
          <OrbitalTrace
            seed={chapter.plateSeed ?? '10'}
            colorSeed={chapter.colorSeed}
            progress={tracePlot}
            active={inView}
          />
        );

      case 'lock':
        return (
          <>
            <motion.div
              style={{ opacity: lockFlash }}
              className="absolute inset-0"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, rgb(var(--signal-rgb) / 0.2), transparent 62%)',
                }}
              />
            </motion.div>
            <AbsFill>
              <OrbitalTrace
                seed={chapter.plateSeed ?? '13'}
                progress={lockPlot}
                active={inView}
              />
            </AbsFill>
          </>
        );

      case 'lost':
        return (
          <OrbitalTrace
            seed={chapter.plateSeed ?? '22'}
            progress={lostPlot}
            opacity={lostOpacity}
            signalLost
            active={inView}
            rotate={false}
          />
        );

      default:
        return null;
    }
  })();

  return (
    <div ref={ref} className="absolute inset-0">
      <StageLayout
        layout={LAYOUT[chapter.stage]}
        copySide={ART_ON_LEFT.has(chapter.id) ? 'right' : 'left'}
        art={art}
        copy={
          chapter.stage === 'archive' ? (
            <ArchiveDocument copy={copy} progress={progress} />
          ) : (
            copy
          )
        }
        overlay={
          chapter.stage === 'trace' ? <RatioReadout progress={progress} /> : null
        }
      />
    </div>
  );
}

function AbsFill({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof motion.div>['style'];
}) {
  return (
    <motion.div style={style} className="absolute inset-0">
      {children}
    </motion.div>
  );
}

/**
 * The archive record is a document, not a stage: header, then the plate
 * strip, then the legend, stacked and scroll-safe.
 */
function ArchiveDocument({
  copy,
  progress,
}: {
  copy: React.ReactNode;
  progress: MotionValue<number>;
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-5 px-6 py-10 sm:px-12 sm:py-14 lg:px-20">
      <div className="shrink-0">{copy}</div>
      <ArchiveStrip progress={progress} />
    </div>
  );
}

/**
 * Candidate ratios from successive passes.
 *
 * Deliberately excludes 3:2. The record's own copy states the ratio does
 * not drift, and 3:2 is the confirmed lock, so showing it here alongside a
 * "no lock" label would contradict the text. These are the near misses.
 */
function RatioReadout({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.24, 0.36, 0.86, 0.96], [0, 1, 1, 0]);
  const ratios = ['4:3', '5:3', '7:5', '4:3', '6:5', '5:4', '4:3'];
  const idx = useTransform(progress, (p) =>
    Math.min(ratios.length - 1, Math.floor(p * ratios.length)),
  );
  const text = useTransform(idx, (i) => ratios[i as number]);

  return (
    <motion.div
      aria-hidden="true"
      style={{ opacity }}
      className="log pointer-events-none absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 text-right lg:block"
    >
      <div className="text-white/28">PASS RATIO</div>
      <motion.div className="tnum signal-text mt-1 text-xl tracking-[0.06em] sm:text-2xl">
        {text}
      </motion.div>
      <div className="mt-1 text-white/22">UNRESOLVED</div>
    </motion.div>
  );
}
