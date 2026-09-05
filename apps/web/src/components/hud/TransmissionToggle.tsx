import { useEffect, useRef, useState } from 'react';
import { transmission } from '../../lib/audio/transmission';
import { CHAPTERS } from '../../content/chapters';
import { useStory } from '../../store/story';
import { useRafLoop } from '../../lib/hooks/useRafLoop';

/**
 * Transmission control.
 *
 * Audio never starts on its own. This is the only thing that opens the
 * channel, and it has to be pressed. Once open, the narration follows the
 * active record automatically.
 *
 * Monochrome like the rest of the chrome, with a live level meter so the
 * control reads as receiver hardware rather than as a media player.
 */

const RECORD_IDS = CHAPTERS.filter((c) => c.lines.length).map((c) => c.id);
const BARS = 5;

export default function TransmissionToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const booted = useStory((s) => s.booted);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const toggle = async (): Promise<void> => {
    setBusy(true);
    const next = !on;
    try {
      await transmission.setEnabled(next, RECORD_IDS);
      setOn(next);
    } finally {
      setBusy(false);
    }
  };

  // Close the channel if the tab goes away, so a backgrounded page is
  // never quietly talking.
  useEffect(() => {
    const onHidden = (): void => {
      if (document.hidden && transmission.isEnabled()) transmission.stopVoice();
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, []);

  useRafLoop(() => {
    const level = transmission.level();
    for (let i = 0; i < BARS; i++) {
      const el = barRefs.current[i];
      if (!el) continue;
      const lit = level * BARS > i;
      const next = lit ? '1' : '0.16';
      if (el.style.opacity !== next) el.style.opacity = next;
    }
  }, on);

  return (
    <div
      data-booted={booted}
      className="fixed bottom-0 right-0 z-40 p-3 transition-opacity duration-700 data-[booted=false]:opacity-0 sm:p-5"
    >
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={on}
        className="log group flex items-center gap-2.5 border border-white/15 bg-black/55 px-2.5 py-2 text-white/70 backdrop-blur-[2px] transition-colors hover:border-white/35 hover:text-white disabled:opacity-50 sm:px-3"
      >
        <span className="relative flex size-1.5 shrink-0">
          {on ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-white/70 [animation-duration:1.6s]" />
              <span className="relative size-1.5 rounded-full bg-white" />
            </>
          ) : (
            <span className="size-1.5 rounded-full border border-white/45" />
          )}
        </span>

        <span className="hidden sm:inline">
          {on ? 'TRANSMISSION OPEN' : 'OPEN TRANSMISSION'}
        </span>
        <span className="sm:hidden">{on ? 'AUDIO ON' : 'AUDIO'}</span>

        {/* level meter */}
        <span aria-hidden="true" className="flex items-end gap-[2px]">
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              ref={(el) => { barRefs.current[i] = el; }}
              className="w-[2px] bg-white"
              style={{ height: `${4 + i * 2}px`, opacity: 0.16 }}
            />
          ))}
        </span>
      </button>
    </div>
  );
}
