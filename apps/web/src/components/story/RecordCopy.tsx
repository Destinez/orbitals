import { motion, useTransform, type MotionValue } from 'motion/react';
import type { Chapter } from '../../content/chapters';
import { TOTAL_RECS } from '../../content/chapters';
import TerminalText from './TerminalText';
import { transmission } from '../../lib/audio/transmission';

/**
 * A record's copy block.
 *
 * The header and readout are ordinary DOM revealed on scroll; the body is
 * printed by the terminal. Printing is what carries the "old computer"
 * register, so the surrounding type stays plain and gets out of its way.
 */

interface Props {
  chapter: Chapter;
  progress: MotionValue<number>;
  /** true while this record is the pinned one */
  active: boolean;
}

export default function RecordCopy({ chapter, progress, active }: Props) {
  const centred = chapter.align === 'center';

  const headOpacity = useTransform(progress, [0, 0.05, 0.86, 0.99], [0, 1, 1, 0]);
  const headY = useTransform(progress, [0, 1], ['1rem', '-2rem']);

  return (
    <div
      className={[
        'w-full',
        centred ? 'mx-auto max-w-[44rem] text-center' : 'max-w-[36rem]',
      ].join(' ')}
    >
      {/* ── header ── */}
      <motion.div style={{ opacity: headOpacity, y: headY }}>
        {chapter.rec ? (
          <div
            className={[
              'log flex items-center gap-3 text-white/45',
              centred ? 'justify-center' : '',
            ].join(' ')}
          >
            <span className="signal-text">REC {chapter.rec}</span>
            <span className="h-px w-8 bg-white/20" />
            <span className="tnum">
              {chapter.rec}/{String(TOTAL_RECS).padStart(2, '0')}
            </span>
          </div>
        ) : null}

        <h2
          id={`${chapter.id}-title`}
          className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.5rem,4.6vw,3.25rem)] font-medium uppercase leading-[0.98] tracking-[-0.02em] text-white"
        >
          {chapter.title}
        </h2>

        {chapter.slug ? (
          <p className="log mt-2.5 text-white/38">
            {chapter.slug}
            <span className="mx-2 text-white/20">/</span>
            <span className="tnum">MET {chapter.met}</span>
          </p>
        ) : null}

        {chapter.quote ? (
          <blockquote className="signal-text signal-glow mt-6 font-[family-name:var(--font-display)] text-[clamp(1.375rem,4vw,2.5rem)] leading-tight tracking-[-0.01em]">
            {chapter.quote}
          </blockquote>
        ) : null}
      </motion.div>

      {/* ── printed transcript ── */}
      <TerminalText
        lines={chapter.lines}
        progress={progress}
        active={active}
        onType={() => transmission.keyClick()}
        className={[
          'mt-5 space-y-2.5 sm:mt-7 sm:space-y-3',
          centred ? 'text-left sm:text-center' : '',
        ].join(' ')}
        lineClassName={centred ? 'sm:mx-auto sm:max-w-[58ch]' : 'max-w-[56ch]'}
      />

      {/* ── measurement readout ── */}
      {chapter.readout?.length ? (
        <Readout
          rows={chapter.readout}
          progress={progress}
          centred={centred}
        />
      ) : null}
    </div>
  );
}

function Readout({
  rows,
  progress,
  centred,
}: {
  rows: [string, string][];
  progress: MotionValue<number>;
  centred: boolean;
}) {
  const opacity = useTransform(progress, [0.42, 0.56, 0.86, 0.99], [0, 1, 1, 0]);

  return (
    <motion.dl
      style={{ opacity }}
      className={[
        'log mt-6 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-white/10 pt-3 text-white/45',
        centred ? 'justify-center' : '',
      ].join(' ')}
    >
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-2">
          <dt className="text-white/25">{k}</dt>
          <dd className="tnum signal-text">{v}</dd>
        </div>
      ))}
    </motion.dl>
  );
}
