import { useRef } from 'react';
import { type MotionValue } from 'motion/react';
import { useCanvasSize } from '../../lib/hooks/useCanvasSize';
import { useRafLoop } from '../../lib/hooks/useRafLoop';
import type { RGB } from '../../lib/palettes';
import { hash2 } from './instruments';

/**
 * L1 — debris field.
 *
 * Three parallax bands of plotted rock. Placement is deterministic
 * (hash2, never Math.random) so the field is identical on every visit and
 * on every re-render, which matters because a field that reshuffles when
 * React remounts reads as a bug.
 *
 * The nearest band gets velocity streaks and the occasional cross glyph;
 * the far band is single dim pixels. All of it drifts on scroll rather
 * than on a timer, so the sense of motion is coupled to the reader.
 */

interface Props {
  progress: MotionValue<number>;
  ink: RGB;
  count?: number;
  active?: boolean;
  className?: string;
}

const BANDS = [
  { depth: 0.28, size: 1, alpha: 0.3, streak: 0 },
  { depth: 0.62, size: 1.6, alpha: 0.5, streak: 0.35 },
  { depth: 1.15, size: 2.6, alpha: 0.72, streak: 1 },
];

export default function AsteroidBelt({
  progress,
  ink,
  count = 130,
  active = true,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const size = useCanvasSize(canvasRef);
  const timeRef = useRef(0);

  useRafLoop((_, dt) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current ?? canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    contextRef.current = ctx;
    const { w, h } = size.current;
    if (!w || !h) return;

    timeRef.current += dt * 0.001;
    const t = timeRef.current;
    const p = Math.max(0, Math.min(1, progress.get()));

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    const per = Math.round(count / BANDS.length);

    BANDS.forEach((band, bi) => {
      const drift = p * w * 0.55 * band.depth + t * 5 * band.depth;

      for (let i = 0; i < per; i++) {
        const id = bi * 997 + i;
        // Wrap across a 1.4w span so rocks enter and leave cleanly.
        const span = w * 1.4;
        let x = (hash2(id, 3) * span - drift) % span;
        if (x < 0) x += span;
        x -= w * 0.2;
        const y = hash2(id, 7) * h;
        if (x < -30 || x > w + 30) continue;

        const wob = Math.sin(t * 0.3 + hash2(id, 13) * 6.28) * 1.5 * band.depth;
        const sz = band.size * (0.5 + hash2(id, 17));
        const a = band.alpha * (0.35 + hash2(id, 19) * 0.65);

        ctx.fillStyle = `rgb(${ink[0]} ${ink[1]} ${ink[2]} / ${a})`;

        if (band.streak > 0 && hash2(id, 29) > 0.72) {
          // motion streak on the near band
          const len = 5 + hash2(id, 31) * 14 * band.streak;
          ctx.fillRect(x, y + wob, len, Math.max(1, sz * 0.5));
          ctx.fillStyle = `rgb(${ink[0]} ${ink[1]} ${ink[2]} / ${a * 1.3})`;
          ctx.fillRect(x + len - 1, y + wob - sz / 2, sz, sz);
        } else if (band.streak >= 1 && hash2(id, 41) > 0.9) {
          // an occasional catalogued fragment, marked with a cross
          const c = 3.5;
          ctx.fillRect(x - c, y + wob, c * 2, 1);
          ctx.fillRect(x, y + wob - c, 1, c * 2);
        } else {
          ctx.fillRect(x, y + wob, sz, sz);
        }
      }
    });

    ctx.globalCompositeOperation = 'source-over';
  }, active);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
