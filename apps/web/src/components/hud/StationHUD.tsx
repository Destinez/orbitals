import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { useStory } from '../../store/story';
import { CHAPTERS, STATION } from '../../content/chapters';
import {
  formatSeconds,
  meter,
  metToSeconds,
  parseMET,
  scramble,
} from '../../lib/met';
import { signalStrength } from '../../store/motion';
import { useRafLoop } from '../../lib/hooks/useRafLoop';

const SCRAMBLE_MS = 620;

/**
 * The station readout. Fixed bottom-left, strictly black and white.
 *
 * Kept monochrome for two reasons: the brief asks for it, and it is the
 * one element that must stay legible over every coloured layer the story
 * puts behind it. Nothing here competes with the signal colour.
 *
 * All fast-changing text is written by a single RAF loop straight into
 * DOM nodes through refs. React only re-renders this component when the
 * *record* changes — a handful of times across the whole scroll — so the
 * ticking clock and the signal meter cost nothing in reconciliation.
 */
export default function StationHUD() {
  const activeMET = useStory((s) => s.activeMET);
  const activeTitle = useStory((s) => s.activeTitle);
  const activeId = useStory((s) => s.activeId);
  const activePlate = useStory((s) => s.activePlate);
  const booted = useStory((s) => s.booted);
  const prefersReduced = useReducedMotion();

  const metRef = useRef<HTMLSpanElement | null>(null);
  const sigBarRef = useRef<HTMLSpanElement | null>(null);
  const sigPctRef = useRef<HTMLSpanElement | null>(null);

  // Anchor for the live clock: the record's canonical timestamp, plus
  // however long we have been sitting in that record.
  const anchor = useRef({ base: 0, at: 0, numeric: true, raw: activeMET });
  const scrambleUntil = useRef(0);

  useEffect(() => {
    const numeric = /^\d/.test(activeMET);
    anchor.current = {
      base: numeric ? metToSeconds(parseMET(activeMET)) : 0,
      at: performance.now(),
      numeric,
      raw: activeMET,
    };
    // The readout re-acquires on every record change, the way an
    // instrument locking onto a new frame would.
    scrambleUntil.current = prefersReduced ? 0 : performance.now() + SCRAMBLE_MS;
  }, [activeMET, activeId, prefersReduced]);

  useRafLoop((now) => {
    const a = anchor.current;

    if (metRef.current) {
      let text: string;
      if (!a.numeric) {
        text = a.raw;
      } else {
        const elapsed = (now - a.at) / 1000;
        text = formatSeconds(a.base + elapsed);
        if (now < scrambleUntil.current) {
          const p = 1 - (scrambleUntil.current - now) / SCRAMBLE_MS;
          text = scramble(text, p, Math.floor(now / 60));
        }
      }
      if (metRef.current.textContent !== text) metRef.current.textContent = text;
    }

    const s = signalStrength.get();
    if (sigBarRef.current) {
      const bar = meter(s, 10);
      if (sigBarRef.current.textContent !== bar) sigBarRef.current.textContent = bar;
    }
    if (sigPctRef.current) {
      const pct = `${String(Math.round(s * 100)).padStart(2, '0')}%`;
      if (sigPctRef.current.textContent !== pct) sigPctRef.current.textContent = pct;
    }
  });

  const recIndex = CHAPTERS.findIndex((c) => c.id === activeId);
  const recNumber = CHAPTERS[recIndex]?.rec;
  const totalRecs = CHAPTERS.filter((c) => c.rec).length;

  return (
    <div
      aria-hidden="true"
      data-booted={booted}
      className="pointer-events-none fixed bottom-0 left-0 z-40 p-3 transition-opacity duration-700 data-[booted=false]:opacity-0 sm:p-5"
    >
      <div className="border border-white/15 bg-black/55 px-2.5 py-2 backdrop-blur-[2px] sm:px-3 sm:py-2.5">
        {/* ── mobile: one compact line ───────────────────────────── */}
        <div className="log flex items-center gap-2 text-white sm:hidden">
          <RecDot />
          <span className="tnum" ref={prefersReduced ? undefined : metRef}>
            {activeMET}
          </span>
          <span className="text-white/35">·</span>
          <span className="text-white/70">
            REC {recNumber ?? '--'}/{String(totalRecs).padStart(2, '0')}
          </span>
        </div>

        {/* ── desktop: full readout ──────────────────────────────── */}
        <div className="log hidden text-white sm:block">
          <div className="flex items-center gap-2">
            <RecDot />
            <span>
              {STATION.designation} <span className="text-white/35">·</span>{' '}
              <span className="text-white/70">{STATION.name}</span>
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-white/40">MET</span>
            <span className="tnum text-[0.8125rem] tracking-[0.12em]" ref={metRef}>
              {activeMET}
            </span>
          </div>

          <div className="mt-1 text-white/70">
            <span className="text-white/40">REC</span>{' '}
            <span className="tnum">
              {recNumber ?? '--'}/{String(totalRecs).padStart(2, '0')}
            </span>{' '}
            <span className="text-white/25">—</span> {activeTitle}
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-white/40">SIG</span>
            <span
              ref={sigBarRef}
              className="tnum tracking-[0.02em] text-white/85"
            >
              {meter(0, 10)}
            </span>
            <span ref={sigPctRef} className="tnum text-white/55">
              00%
            </span>
            {activePlate ? (
              <span className="ml-1 text-white/35">PLATE {activePlate}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pulsing record indicator. Pure CSS so it costs no JS frames. */
function RecDot() {
  return (
    <span className="relative inline-flex size-1.5 shrink-0">
      <span className="absolute inset-0 animate-ping rounded-full bg-white/70 [animation-duration:2.4s]" />
      <span className="relative inline-flex size-1.5 rounded-full bg-white" />
    </span>
  );
}
