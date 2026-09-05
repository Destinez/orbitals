import { useEffect, useRef, type RefObject } from 'react';

export const MAX_DPR = 2;

/**
 * Keeps a canvas's backing store matched to its CSS box, with device
 * pixel ratio capped.
 *
 * The cap matters: on a 3x phone an uncapped fullscreen canvas is ~9x the
 * fill rate of a 1x one, which is the difference between 60fps and a
 * slideshow. 2x is past the point of visible return for the soft,
 * additive marks this site draws.
 *
 * Returns a ref holding the current logical (CSS pixel) size, so draw
 * code can lay out in CSS pixels and ignore DPR entirely — the context
 * is pre-scaled.
 */
export function useCanvasSize(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onResize?: (w: number, h: number, dpr: number) => void,
): RefObject<{ w: number; h: number; dpr: number }> {
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const cb = useRef(onResize);
  cb.current = onResize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const apply = (): void => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (size.current.w === w && size.current.h === h && size.current.dpr === dpr) {
        return;
      }
      size.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cb.current?.(w, h, dpr);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(canvas);
    window.addEventListener('orientationchange', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', apply);
    };
  }, [canvasRef]);

  return size;
}
