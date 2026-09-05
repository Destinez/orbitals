/**
 * Station interface — a spacecraft instrument panel, not a card.
 *
 * Precise grid, hairline rules, corner registration ticks, calibration
 * marks, measurement bars and small gauges. It reads the survey's own
 * fields plus a few derived indicators (archive recovery, signal, orbital
 * inclination, resonance lock) that add no new lore. Everything is small,
 * aligned, and restrained; behaviour (signal build, lock state, a slow
 * scan) is driven by the frame so it feels live.
 */

import React from 'react';
import { CYAN, CYAN_DIM, CYAN_FAINT, MONO, WHITE } from '../theme';

interface Props {
  opacity: number;
  frame: number;
  progress: number;
  inclinationDeg: number;
  ratioLabel: string;
  eccentricity: number;
}

const LABEL = 148;

const Rule: React.FC<{ my?: number }> = ({ my = 10 }) => (
  <div style={{ height: 1, background: CYAN_FAINT, margin: `${my}px 0` }} />
);

const Row: React.FC<{ k: string; v: string; bright?: boolean }> = ({ k, v, bright }) => (
      <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: '20px' }}>
    <span style={{ width: LABEL, color: CYAN_DIM, letterSpacing: 2 }}>{k}</span>
    <span style={{ color: bright ? WHITE : CYAN, letterSpacing: 1.5, opacity: bright ? 0.92 : 0.85 }}>{v}</span>
  </div>
);

const Bar: React.FC<{ label: string; value: number; text: string }> = ({ label, value, text }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', color: CYAN_DIM, letterSpacing: 2, fontSize: 10 }}>
      <span>{label}</span>
      <span style={{ color: CYAN, opacity: 0.85 }}>{text}</span>
    </div>
    <div style={{ position: 'relative', height: 4, marginTop: 4, background: 'rgba(105,240,207,0.12)' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${Math.round(value * 100)}%`, background: CYAN, opacity: 0.55 }} />
      {/* segment ticks */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between' }}>
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} style={{ width: 1, background: 'rgba(0,0,0,0.6)' }} />
        ))}
      </div>
    </div>
  </div>
);

const Corner: React.FC<{ pos: [string, string] }> = ({ pos }) => {
  const [v, h] = pos;
  return (
    <div
      style={{
        position: 'absolute',
        [v]: -1,
        [h]: -1,
        width: 12,
        height: 12,
        [`border${v[0].toUpperCase()}${v.slice(1)}`]: `1px solid ${CYAN_DIM}`,
        [`border${h[0].toUpperCase()}${h.slice(1)}`]: `1px solid ${CYAN_DIM}`,
      } as React.CSSProperties}
    />
  );
};

export const StationInterface: React.FC<Props> = ({
  opacity,
  frame,
  progress,
  inclinationDeg,
  ratioLabel,
  eccentricity,
}) => {
  const locked = progress >= 0.999;
  const signal = Math.min(1, progress * 0.9 + (locked ? 0.1 : 0));
  const blink = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame * 0.35));
  const scanY = ((frame * 0.9) % 220) + 8;
  const inclNorm = Math.min(1, inclinationDeg / 45);

  return (
    <div
      style={{
        position: 'absolute',
        left: 42,
        bottom: 26,
        width: 336,
        opacity,
        fontFamily: MONO,
        fontSize: 12,
        color: CYAN,
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', letterSpacing: 3, fontSize: 11 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: WHITE, opacity: 0.9 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: CYAN, opacity: blink, boxShadow: `0 0 6px ${CYAN}` }} />
          KX-19
        </span>
        <span style={{ color: CYAN_DIM }}>{locked ? 'LOCKED' : 'TRACKING'}</span>
      </div>
      <div style={{ color: CYAN_DIM, letterSpacing: 4, fontSize: 9, marginTop: 3 }}>DEEP-SPACE SURVEY / OBSERVATION LOG</div>

      <Rule my={12} />

      {/* framed data block with corner ticks and a slow scan line */}
      <div style={{ position: 'relative', padding: '12px 12px', border: `1px solid ${CYAN_FAINT}` }}>
        <Corner pos={['top', 'left']} />
        <Corner pos={['top', 'right']} />
        <Corner pos={['bottom', 'left']} />
        <Corner pos={['bottom', 'right']} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: scanY,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(105,240,207,0.35), transparent)',
          }}
        />

        <Row k="SURVEY STATION" v="KX-19" bright />
        <Row k="SECTOR" v="44-VELA" />
        <Row k="POWER" v="AUXILIARY" />
        <Row k="CREW" v="000" />
        <Row k="TRACKED OBJECT" v="0417" bright />

        <Bar label="ARCHIVE RECOVERY" value={0.71} text="71%" />
        <Bar label="SIGNAL ACQ." value={signal} text={`${Math.round(signal * 100)}%`} />
      </div>

      <Rule my={12} />

      {/* derived observation indicators */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: CYAN_DIM, letterSpacing: 2, fontSize: 10 }}>INCLINATION</div>
          <div style={{ color: WHITE, opacity: 0.9, fontSize: 15, letterSpacing: 1 }}>{inclinationDeg.toFixed(1)}&deg;</div>
          <div style={{ position: 'relative', height: 3, marginTop: 5, background: 'rgba(105,240,207,0.12)' }}>
            <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${inclNorm * 100}%`, width: 1, background: CYAN }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: CYAN_DIM, letterSpacing: 2, fontSize: 10 }}>RESONANCE</div>
          <div style={{ color: WHITE, opacity: 0.9, fontSize: 15, letterSpacing: 4 }}>{ratioLabel}</div>
          <div style={{ color: CYAN_DIM, fontSize: 10, marginTop: 4 }}>e {eccentricity.toFixed(3)}</div>
        </div>
      </div>

      <Rule my={12} />

      {/* coordinate ticks + calibration */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 16 }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ width: 1, height: i % 6 === 0 ? 12 : 6, background: i % 6 === 0 ? CYAN_DIM : CYAN_FAINT }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: CYAN_DIM, letterSpacing: 2, fontSize: 9, marginTop: 4 }}>
        <span>44&deg;.0</span>
        <span>VELA</span>
        <span>+18&deg;.4</span>
      </div>
    </div>
  );
};
