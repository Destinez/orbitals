import { useEffect, useRef } from 'react';
import { motion, useTransform, useReducedMotion, type MotionValue } from 'motion/react';

/**
 * Terminal transcript.
 *
 * The record's copy prints itself the way a line printer would: character
 * by character, line after line, with a block cursor sitting at the write
 * head. Scroll controls whether the block is present at all; the printing
 * itself runs on its own clock once the record is pinned, so text arrives
 * even if the reader stops moving.
 *
 * Characters are written straight into text nodes from a RAF loop. Doing
 * this through React state would mean one re-render per character — a few
 * thousand renders per record — for output that is only ever text.
 *
 * `lines` is the same array the narration reads, so this doubles as the
 * caption track for the transmission audio.
 */

const CPS = 62; // characters per second, near read-aloud pace
const LINE_PAUSE = 0.3; // seconds held between lines
/**
 * Scroll fraction by which the transcript should be fully printed. Past
 * this point the reader has clearly committed to the record, so the
 * printer catches up rather than making them wait.
 */
const CAUGHT_UP_BY = 0.62;

interface Props {
  lines: string[];
  progress: MotionValue<number>;
  /** true while this record is pinned */
  active: boolean;
  /** fires on each printed character, for the key click */
  onType?: () => void;
  /** fires when a line finishes printing */
  onLine?: (index: number) => void;
  className?: string;
  lineClassName?: string;
}

export default function TerminalText({
  lines,
  progress,
  active,
  onType,
  onLine,
  className,
  lineClassName,
}: Props) {
  const prefersReduced = useReducedMotion();
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const doneRef = useRef(false);
  const onTypeRef = useRef(onType);
  const onLineRef = useRef(onLine);
  onTypeRef.current = onType;
  onLineRef.current = onLine;

  // Scroll owns presence; the printer owns content.
  const opacity = useTransform(progress, [0, 0.05, 0.86, 0.99], [0, 1, 1, 0]);
  const y = useTransform(progress, [0, 1], ['0.75rem', '-1.75rem']);

  useEffect(() => {
    // Reduced motion, or a record already read: show the full transcript.
    if (prefersReduced) {
      lines.forEach((line, i) => {
        const n = nodeRefs.current[i];
        if (n) n.textContent = line;
        const c = cursorRefs.current[i];
        if (c) c.style.display = 'none';
      });
      doneRef.current = true;
      return;
    }
    if (!active || doneRef.current) return;

    let raf = 0;
    let start = 0;
    let lastCount = 0;
    let announced = -1;

    // Cumulative character offsets, so one clock drives every line.
    const offsets: number[] = [];
    let acc = 0;
    for (const line of lines) {
      offsets.push(acc);
      acc += line.length;
    }
    const totalChars = acc;

    const tick = (now: number): void => {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;

      // Each completed line costs an extra pause, so lines feel typed
      // rather than streamed as one run-on block.
      let timed = 0;
      let remaining = elapsed;
      for (let i = 0; i < lines.length; i++) {
        const len = lines[i].length;
        const dur = len / CPS;
        if (remaining <= 0) break;
        if (remaining >= dur + LINE_PAUSE) {
          timed = offsets[i] + len;
          remaining -= dur + LINE_PAUSE;
        } else {
          timed = offsets[i] + Math.min(len, Math.floor(remaining * CPS));
          remaining = 0;
        }
      }

      // Scroll can only ever pull the printer forward, never hold it back.
      // Sitting still prints at reading pace; scrolling on completes the
      // transcript instead of leaving it half-written behind the reader.
      const scrolled = Math.floor(
        (Math.min(1, progress.get() / CAUGHT_UP_BY) || 0) * totalChars,
      );
      const count = Math.max(timed, scrolled);

      if (count !== lastCount) {
        if (onTypeRef.current && count > lastCount) onTypeRef.current();
        lastCount = count;

        for (let i = 0; i < lines.length; i++) {
          const shown = Math.max(0, Math.min(lines[i].length, count - offsets[i]));
          const node = nodeRefs.current[i];
          if (node) {
            const next = lines[i].slice(0, shown);
            if (node.textContent !== next) node.textContent = next;
          }
          // Cursor sits on the line currently being written.
          const writing =
            shown > 0 && shown < lines[i].length
              ? true
              : shown === 0 && i > 0 && count >= offsets[i];
          const c = cursorRefs.current[i];
          // Toggled with `display`, not opacity: the blink is a CSS
          // animation, and an animated opacity keyframe wins over an
          // inline opacity, which left a cursor parked on finished lines.
          if (c) c.style.display = writing ? 'inline-block' : 'none';

          if (shown === lines[i].length && announced < i) {
            announced = i;
            onLineRef.current?.(i);
          }
        }
      }

      if (count >= totalChars) {
        doneRef.current = true;
        // Park the cursor at the end of the last line.
        const last = cursorRefs.current[lines.length - 1];
        if (last) last.style.display = 'inline-block';
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, lines, prefersReduced, progress]);

  return (
    <motion.div style={{ opacity, y }} className={className}>
      {lines.map((line, i) => (
        <p
          key={i}
          className={[
            'terminal-line text-[0.875rem] leading-[1.75] text-white/78 sm:text-[0.9375rem]',
            lineClassName ?? '',
          ].join(' ')}
        >
          <span aria-hidden="true" className="mr-2 select-none text-white/25">
            &gt;
          </span>
          {/* Full text is present for assistive tech and crawlers; the
              printed copy is the visible one. */}
          <span className="sr-only">{line}</span>
          <span ref={(el) => { nodeRefs.current[i] = el; }} aria-hidden="true" />
          <span
            ref={(el) => { cursorRefs.current[i] = el; }}
            aria-hidden="true"
            className="terminal-cursor ml-0.5 h-[0.95em] w-[0.5em] translate-y-[0.1em] bg-white/80"
            style={{ display: 'none' }}
          />
        </p>
      ))}
    </motion.div>
  );
}
