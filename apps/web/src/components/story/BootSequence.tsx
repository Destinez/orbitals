import { useEffect, useRef, useState } from 'react';
import { motion, useTransform, useReducedMotion, type MotionValue } from 'motion/react';
import { BOOT_LINES, STATION } from '../../content/chapters';
import { useStory } from '../../store/story';

/**
 * REC 00 — the cold open.
 *
 * Runs on a timer rather than on scroll, because a station coming up on
 * auxiliary power should not wait for the reader to do something. The
 * boot print completes, the title resolves, and only then does the HUD
 * and frame chrome fade in (`booted`) — so the instrument surround
 * arrives as a consequence of the station waking, not as page furniture.
 *
 * Scroll then fades the whole thing out and hands over to REC 01.
 */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+=%/\\<>[]';
const LINE_MS = 240;
const TITLE_MS = 1000;

interface Props {
  progress: MotionValue<number>;
}

export default function BootSequence({ progress }: Props) {
  const prefersReduced = useReducedMotion();
  const setBooted = useStory((s) => s.setBooted);

  const [printed, setPrinted] = useState(prefersReduced ? BOOT_LINES.length : 0);
  const [title, setTitle] = useState(prefersReduced ? 'ORBITALS' : '');
  const titleRef = useRef<HTMLSpanElement | null>(null);

  // ── boot print ──
  useEffect(() => {
    if (prefersReduced) {
      setBooted(true);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setPrinted(i);
      if (i >= BOOT_LINES.length) window.clearInterval(id);
    }, LINE_MS);
    return () => window.clearInterval(id);
  }, [prefersReduced, setBooted]);

  // ── title resolve, then unlock the chrome ──
  useEffect(() => {
    if (prefersReduced) return;
    const start = BOOT_LINES.length * LINE_MS + 260;
    const target = 'ORBITALS';
    let raf = 0;
    let t0 = 0;

    const tick = (now: number): void => {
      if (!t0) t0 = now;
      const elapsed = now - t0;
      if (elapsed < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, (elapsed - start) / TITLE_MS);
      const settled = Math.floor(p * target.length);
      let out = target.slice(0, settled);
      for (let i = settled; i < target.length; i++) {
        out += GLYPHS[(i * 7 + Math.floor(now / 45)) % GLYPHS.length];
      }
      if (titleRef.current) titleRef.current.textContent = out;
      if (p >= 1) {
        setTitle(target);
        setBooted(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReduced, setBooted]);

  const opacity = useTransform(progress, [0, 0.55, 0.8], [1, 1, 0]);
  const y = useTransform(progress, [0, 1], ['0rem', '-4rem']);
  const hintOpacity = useTransform(progress, [0, 0.12], [1, 0]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6"
    >
      {/* boot print */}
      <div className="log w-full max-w-[26rem] text-white/50">
        {BOOT_LINES.map(([key, value], i) => (
          <div
            key={key}
            data-shown={i < printed}
            className="flex items-baseline justify-between gap-3 opacity-0 transition-opacity duration-300 data-[shown=true]:opacity-100"
          >
            <span className="text-white/35">{key}</span>
            <span className="min-w-0 flex-1 translate-y-[-0.2em] border-b border-dotted border-white/12" />
            <span className="text-white/75">{value}</span>
          </div>
        ))}
      </div>

      {/* title */}
      <h1 className="mt-10 text-center font-[family-name:var(--font-display)] text-[clamp(2.5rem,13vw,8rem)] font-medium uppercase leading-none tracking-[-0.03em] text-white sm:mt-12">
        <span ref={titleRef} className="tabular-nums">
          {title}
        </span>
      </h1>

      <p className="log mt-5 text-center text-white/40">
        {STATION.sector}
        <span className="mx-2 text-white/20">·</span>
         RECOVERED RESONANCE LOG
      </p>

      <motion.p
        style={{ opacity: hintOpacity }}
        className="log absolute bottom-[18%] text-white/30"
      >
        SCROLL TO THE MISSION ↓
      </motion.p>
    </motion.div>
  );
}
