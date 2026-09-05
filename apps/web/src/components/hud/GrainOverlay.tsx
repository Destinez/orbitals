import { useMemo } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * One fixed overlay providing film grain, scanlines and a corner
 * vignette for the entire site.
 *
 * Deliberately a single element rather than a per-section treatment:
 * the texture should feel like a property of the instrument we are
 * looking through, which means it must not shift or re-seed as records
 * change. The grain is an inline SVG feTurbulence, so there is no image
 * request and nothing to cache.
 */
export default function GrainOverlay() {
  const prefersReduced = useReducedMotion();

  const grainUrl = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="160" height="160" filter="url(#n)" opacity="0.5"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      {/* film grain */}
      <div
        className="absolute inset-0 opacity-[0.055] mix-blend-overlay"
        style={{
          backgroundImage: grainUrl,
          backgroundRepeat: 'repeat',
          // A slow drift keeps the grain from reading as a static texture
          // sitting on the glass. Disabled under reduced motion.
          animation: prefersReduced ? undefined : 'grain-drift 8s steps(6) infinite',
        }}
      />

      {/* scanlines — 1px, very low contrast */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.055) 0px, rgba(255,255,255,0.055) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* vignette — pulls the eye to the centre of the plate */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(0,0,0,0.32) 78%, rgba(0,0,0,0.62) 100%)',
        }}
      />

      <style>{`
        @keyframes grain-drift {
          0%   { transform: translate(0, 0) }
          20%  { transform: translate(-3%, 2%) }
          40%  { transform: translate(2%, -3%) }
          60%  { transform: translate(-2%, -2%) }
          80%  { transform: translate(3%, 1%) }
          100% { transform: translate(0, 0) }
        }
      `}</style>
    </div>
  );
}
