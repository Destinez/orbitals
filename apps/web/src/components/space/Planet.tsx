import { useRef } from 'react';
import { type MotionValue } from 'motion/react';
import { useCanvasSize } from '../../lib/hooks/useCanvasSize';
import { useRafLoop } from '../../lib/hooks/useRafLoop';
import type { RGB } from '../../lib/palettes';
import { dottedArc, glow, hash2, label, reticle } from './instruments';

/**
 * L1 — a body in transit.
 *
 * Not a shaded sphere. The limb is a dense dotted arc, the terminator is
 * a dotted ellipse, and the dark side is implied by falling point density
 * rather than by fill. Same reason as everything else in this layer: a
 * rendered sphere would look like it came from a different program than
 * the plates do.
 *
 * Crosses the frame over the record's scroll, with a reticle and a
 * bearing label tracking it.
 */

interface Props {
  progress: MotionValue<number>;
  ink: RGB;
  /** 0..1 vertical placement */
  y?: number;
  /** radius as a fraction of the smaller viewport axis */
  scale?: number;
  /** phase of illumination, 0..1 */
  phase?: number;
  name?: string;
  active?: boolean;
  className?: string;
}

export default function Planet({
  progress,
  ink,
  y = 0.42,
  scale = 0.19,
  phase = 0.62,
  name = 'UNCATALOGUED',
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

    const unit = Math.min(w, h);
    const r = unit * scale;
    // Transits right to left, entering and leaving fully offscreen.
    const cx = w * (1.28 - p * 1.56);
    const cy = h * y + Math.sin(t * 0.08) * unit * 0.008;

    if (cx < -r * 3 || cx > w + r * 3) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // ── lit limb: brightest at the sub-stellar point, falling off ──
    const litCenter = Math.PI * (2 * phase - 0.5);
    for (let ring = 0; ring < 3; ring++) {
      const rr = r * (1 - ring * 0.055);
      dottedArc(ctx, cx, cy, rr, 0, Math.PI * 2, ink, {
        count: Math.round(rr * 3),
        size: ring === 0 ? 1.5 : 1,
        alpha: 0.9 - ring * 0.28,
        alphaAt: (u) => {
          const a = u * Math.PI * 2;
          // cosine of angular distance from the lit centre
          const d = Math.cos(a - litCenter);
          return Math.max(0.04, (d + 1) / 2) ** 1.6;
        },
      });
    }

    // ── terminator: a dotted ellipse across the disc ──
    const termWidth = Math.cos(Math.PI * (phase - 0.5)) * r;
    dottedArc(ctx, cx, cy, r, -Math.PI / 2, Math.PI / 2, ink, { alpha: 0 });
    for (let i = 0; i < 90; i++) {
      const u = i / 89;
      const a = -Math.PI / 2 + u * Math.PI;
      const px = cx + Math.sin(a) * termWidth;
      const py = cy - Math.cos(a) * r;
      ctx.fillStyle = `rgb(${ink[0]} ${ink[1]} ${ink[2]} / ${0.34 * (1 - Math.abs(u - 0.5) * 0.7)})`;
      ctx.fillRect(px - 0.5, py - 0.5, 1.2, 1.2);
    }

    // ── surface sampling: sparse plotted points, denser on the lit side ──
    for (let i = 0; i < 150; i++) {
      const a = hash2(i, 11) * Math.PI * 2;
      const rad = Math.sqrt(hash2(i, 23)) * r * 0.96;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      const lit = Math.max(0, Math.cos(a - litCenter));
      const alpha = 0.05 + lit * 0.22 * hash2(i, 37);
      ctx.fillStyle = `rgb(${ink[0]} ${ink[1]} ${ink[2]} / ${alpha})`;
      ctx.fillRect(px, py, 1, 1);
    }

    // atmosphere / limb bloom
    glow(ctx, cx + Math.cos(litCenter) * r * 0.3, cy + Math.sin(litCenter) * r * 0.3, r * 1.5, ink, 0.1);

    // ── annotation ──
    ctx.globalCompositeOperation = 'source-over';
    const vis = Math.min(1, Math.max(0, 1 - Math.abs(p - 0.5) * 2.4));
    if (vis > 0.02) {
      reticle(ctx, cx, cy, r * 1.28, ink, { alpha: 0.28 * vis, ring: true, len: 9 });
      label(ctx, name, cx, cy - r * 1.28 - 18, ink, {
        alpha: 0.45 * vis,
        align: 'center',
      });
      label(
        ctx,
        `R ${(r * 42).toFixed(0)} KM   AZ ${(214 + p * 12).toFixed(1)}`,
        cx,
        cy + r * 1.28 + 20,
        ink,
        { alpha: 0.3 * vis, align: 'center', size: 8 },
      );
    }

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
