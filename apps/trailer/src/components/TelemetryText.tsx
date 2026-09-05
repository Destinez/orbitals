/**
 * Secondary telemetry — the small readouts a tracking terminal would
 * carry around the frame: a mission-elapsed clock, pointing coordinates,
 * capture mode and a live frame counter, plus a vertical acquisition
 * scale down the right edge whose marker follows the trace. Kept faint
 * and secondary to the orbital system.
 */

import React from 'react';
import { CYAN, CYAN_DIM, CYAN_FAINT, MONO, WHITE } from '../theme';
import { FPS } from '../config';

interface Props {
  opacity: number;
  frame: number;
  progress: number;
}

function met(frame: number): string {
  const base = ((8 * 24 + 22) * 60 + 3) * 60; // 08:22:03:00
  const total = base + Math.floor(frame / FPS);
  const dd = Math.floor(total / 86400);
  const hh = Math.floor((total % 86400) / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(dd)}:${p(hh)}:${p(mm)}:${p(ss)}`;
}

const Field: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, lineHeight: '18px' }}>
    <span style={{ color: CYAN_DIM, letterSpacing: 2 }}>{k}</span>
    <span style={{ color: WHITE, opacity: 0.85, letterSpacing: 1.5, minWidth: 118, textAlign: 'right' }}>{v}</span>
  </div>
);

export const TelemetryText: React.FC<Props> = ({ opacity, frame, progress }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, fontFamily: MONO, fontSize: 12 }}>
      {/* top-right instrument block */}
      <div style={{ position: 'absolute', top: 60, right: 74, textAlign: 'right' }}>
        <div style={{ color: CYAN, letterSpacing: 3, fontSize: 11 }}>MISSION ELAPSED</div>
        <div style={{ color: WHITE, opacity: 0.92, letterSpacing: 3, fontSize: 20, margin: '2px 0 10px' }}>{met(frame)}</div>
        <Field k="R.A." v="09h 14m 22s" />
        <Field k="DEC" v="-47&deg; 22' 05&quot;" />
        <Field k="MODE" v="OPTICAL / IR" />
        <Field k="FRAME" v={String(100000 + frame)} />
      </div>

      {/* right-edge acquisition scale */}
      <div style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', height: 360, width: 22 }}>
        <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 1, background: CYAN_FAINT }} />
        {Array.from({ length: 21 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: i % 5 === 0 ? 4 : 7, top: `${(i / 20) * 100}%`, width: i % 5 === 0 ? 14 : 8, height: 1, background: i % 5 === 0 ? CYAN_DIM : CYAN_FAINT }} />
        ))}
        <div style={{ position: 'absolute', left: 2, top: `${(1 - progress) * 100}%`, width: 18, height: 1, background: CYAN, boxShadow: `0 0 6px ${CYAN}` }} />
        <div style={{ position: 'absolute', left: 20, top: `${(1 - progress) * 100}%`, transform: 'translateY(-50%)', color: CYAN, fontSize: 9, whiteSpace: 'nowrap' }}>{Math.round(progress * 100)}</div>
      </div>
    </div>
  );
};
