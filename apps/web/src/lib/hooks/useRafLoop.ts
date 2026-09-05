import { useEffect, useRef } from 'react';

/**
 * A requestAnimationFrame loop that only runs when it should.
 *
 * Every canvas layer in the site uses this. `active` is normally wired to
 * an IntersectionObserver result, so an offscreen chapter costs zero
 * frames rather than quietly burning battery behind the viewport.
 *
 * The callback is held in a ref, so passing an inline arrow does not
 * restart the loop on every render.
 */
export function useRafLoop(
  callback: (t: number, dt: number) => void,
  active = true,
): void {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let stopped = false;

    const tick = (now: number): void => {
      if (stopped) return;
      if (document.hidden) return;
      // Clamp dt so a backgrounded tab returning does not produce one
      // enormous integration step.
      const dt = Math.min(now - last, 64);
      last = now;
      cb.current(now, dt);
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = (): void => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        return;
      }
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active]);
}
