import { useRef } from 'react';
import { type MotionValue } from 'motion/react';
import { useCanvasSize } from '../../lib/hooks/useCanvasSize';
import { useRafLoop } from '../../lib/hooks/useRafLoop';
import type { RGB } from '../../lib/palettes';
import { dottedArc, dottedLine, glow, label, reticle, tickRun } from './instruments';

/**
 * L1 — Relay station KX-19, drawn as its own schematic.
 *
 * A dish, a spine, two booms and a counterweight, plotted as dotted runs
 * with measurement ticks. It rotates slowly and unevenly: the dish keeps
 * tracking while the hull drifts, which is the detail that sells "still
 * running, nobody aboard".
 */

interface Props {
  progress: MotionValue<number>;
  ink: RGB;
  active?: boolean;
  className?: string;
}

export default function StationSchematic({
  progress,
  ink,
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

    const unit = Math.min(w, h);
    // Drifts up and slightly right across the record, and recedes.
    const cx = w * 0.5 + unit * 0.06 * p;
    const cy = h * 0.52 - unit * 0.1 * p;
    const s = (unit / 900) * (1.05 - p * 0.18);

    ctx.save();
    ctx.translate(cx, cy);
    // Hull drift: slow, never settling.
    ctx.rotate(Math.sin(t * 0.06) * 0.05 - 0.22);
    ctx.scale(s, s);

    const fade = 0.85 - p * 0.25;

    // ── spine ──
    dottedLine(ctx, -300, 0, 250, 0, ink, { alpha: 0.5 * fade, size: 1.4 });
    dottedLine(ctx, -300, -7, 250, -7, ink, { alpha: 0.16 * fade });
    dottedLine(ctx, -300, 7, 250, 7, ink, { alpha: 0.16 * fade });

    // hull segment ribs
    for (let i = -5; i <= 4; i++) {
      const x = i * 52;
      dottedLine(ctx, x, -14, x, 14, ink, { alpha: 0.22 * fade, count: 7 });
    }

    // ── dish: still tracking, independent of the hull ──
    const dishAngle = -0.5 + Math.sin(t * 0.11) * 0.16;
    ctx.save();
    ctx.translate(250, 0);
    ctx.rotate(dishAngle);
    for (let k = 0; k < 5; k++) {
      const r = 120 - k * 18;
      dottedArc(ctx, 0, 0, r, -Math.PI * 0.62, Math.PI * 0.62, ink, {
        alpha: (0.5 - k * 0.07) * fade,
        size: k === 0 ? 1.4 : 1,
      });
    }
    // feed horn + struts
    dottedLine(ctx, 0, 0, 92, 0, ink, { alpha: 0.4 * fade });
    dottedLine(ctx, 92, 0, 60, -66, ink, { alpha: 0.2 * fade });
    dottedLine(ctx, 92, 0, 60, 66, ink, { alpha: 0.2 * fade });
    glow(ctx, 92, 0, 34, ink, 0.3 * fade);
    ctx.restore();

    // ── booms ──
    for (const dir of [-1, 1]) {
      dottedLine(ctx, -60, 0, -60, dir * 210, ink, { alpha: 0.34 * fade });
      // panel ladders
      for (let i = 3; i <= 10; i++) {
        const y = dir * i * 20;
        dottedLine(ctx, -92, y, -28, y, ink, { alpha: 0.16 * fade, count: 12 });
      }
      dottedLine(ctx, -92, dir * 60, -92, dir * 205, ink, { alpha: 0.2 * fade });
      dottedLine(ctx, -28, dir * 60, -28, dir * 205, ink, { alpha: 0.2 * fade });
    }

    // ── counterweight ──
    dottedArc(ctx, -300, 0, 26, 0, Math.PI * 2, ink, { alpha: 0.45 * fade });
    glow(ctx, -300, 0, 30, ink, 0.16 * fade);

    // ── instrument annotation ──
    ctx.globalCompositeOperation = 'source-over';
    reticle(ctx, 250, 0, 138, ink, { alpha: 0.2 * fade, ring: false, len: 10 });
    tickRun(ctx, -300, 150, 340, ink, { alpha: 0.16 * fade, spacing: 20 });
    label(ctx, 'KX-19', -300, -46, ink, { alpha: 0.4 * fade, size: 11 });
    label(ctx, 'DISH / TRACKING', 250, 168, ink, { alpha: 0.3 * fade, align: 'center' });
    label(ctx, 'ARRAY A', -60, 232, ink, { alpha: 0.25 * fade, align: 'center' });
    label(ctx, 'ARRAY B', -60, -232, ink, { alpha: 0.25 * fade, align: 'center' });

    ctx.restore();
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
