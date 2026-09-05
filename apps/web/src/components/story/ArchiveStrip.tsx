import { useEffect, useRef, useState } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { renderPlateRGBA, lockDisplay, curveFamilyDisplay } from '../../lib/resonance';
import { PALETTE_DISPLAY } from '../../lib/palettes';
import { TRAIT_LEGEND } from '../../content/chapters';

/**
 * REC 07 — the archive.
 *
 * The plates in this strip are not images. Each is rendered in the browser
 * from its seed by the verified port, which makes the provenance claim
 * literal: if the site reproduces a plate exactly from a number, nothing
 * about that plate was arranged afterwards.
 *
 * Rendering is spread one plate per idle slot. A single plate is roughly
 * 15ms of curve plotting plus a full-frame bloom pass, so six of them in
 * one frame would drop frames exactly as the reader arrives.
 */

const PLATE_SEEDS = ['13', '14', '21', '7', '1', '10'];
const COMMIT_HASH =
  'e362f05861138e8fd5022d752f669c59f6b6c01cbc576d2426e60c7675fcc569';
const PASSES = '3,232';

interface Props {
  progress: MotionValue<number>;
}

export default function ArchiveStrip({ progress }: Props) {
  const opacity = useTransform(progress, [0.16, 0.34], [0, 1]);
  const y = useTransform(progress, [0.16, 0.52], ['1.5rem', '0rem']);

  return (
    <motion.div style={{ opacity, y }} className="min-h-0 shrink">
      {/* plate strip */}
      <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-3">
        {PLATE_SEEDS.map((seed, i) => (
          <Plate key={seed} seed={seed} order={i} />
        ))}
      </div>

      {/* provenance */}
      <div className="log mt-4 border-t border-white/10 pt-3 text-white/40">
        <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1.5 text-center">
          <Stat k="PASSES" v={PASSES} />
          <Stat k="1/1" v="SIGNAL LOST" />
          <Stat k="RENDER" v="DETERMINISTIC" />
          <span className="hidden max-w-full truncate sm:inline">
            <span className="text-white/25">COMMIT</span>{' '}
            <span className="tnum text-white/55">{COMMIT_HASH.slice(0, 20)}…</span>
          </span>
        </div>
      </div>

      {/* trait legend — hidden on the shortest viewports, where the plates
          and provenance matter more than the full table */}
      <div className="mt-4 hidden grid-cols-2 gap-x-6 gap-y-2 sm:grid lg:grid-cols-4">
        {TRAIT_LEGEND.map((t) => (
          <div key={t.trait} className="border-t border-white/8 pt-1.5">
            <div className="log text-[0.5625rem] text-white/65">{t.trait}</div>
            <div className="log mt-0.5 text-[0.5rem] text-white/32">{t.values}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <span>
      <span className="text-white/25">{k}</span>{' '}
      <span className="tnum text-white/70">{v}</span>
    </span>
  );
}

/** One plate, rendered from its seed by the verified port. */
function Plate({ seed, order }: { seed: string; order: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [meta, setMeta] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const schedule =
      'requestIdleCallback' in window
        ? (fn: () => void) =>
            (
              window as unknown as {
                requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number;
              }
            ).requestIdleCallback(fn, { timeout: 900 + order * 220 })
        : (fn: () => void) => window.setTimeout(fn, 120 + order * 160);

    schedule(() => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const isSignalLost = seed === '22';
      const { data, size, params } = renderPlateRGBA(seed, { isSignalLost });
      canvas.width = size;
      canvas.height = size;
      ctx.putImageData(new ImageData(data, size, size), 0, 0);

      setMeta([
        `#${seed}`,
        lockDisplay(params),
        PALETTE_DISPLAY[params.paletteName] ?? params.paletteName,
        curveFamilyDisplay(params.curveFamily),
      ]);
    });

    return () => {
      cancelled = true;
    };
  }, [seed, order]);

  return (
    <figure className="w-[calc(33.333%-0.5rem)] max-w-[8rem] sm:w-[6.5rem] sm:max-w-none lg:w-[8rem]">
      <div className="relative border border-white/10 bg-[#04050a]">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="block aspect-square w-full"
        />
        <figcaption className="log absolute inset-x-0 bottom-0 flex items-center justify-between gap-1.5 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-4 text-[0.5rem] text-white/55">
          <span className="tnum shrink-0">{meta?.[0] ?? '—'}</span>
          <span className="hidden truncate text-white/35 lg:inline">{meta?.[1] ?? ''}</span>
        </figcaption>
      </div>
      <div className="log mt-1 hidden text-[0.5rem] leading-relaxed text-white/28 lg:block">
        {meta ? `${meta[2]} · ${meta[3]}` : '\u00a0'}
      </div>
    </figure>
  );
}
