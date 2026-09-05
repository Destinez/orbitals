/**
 * Transmission audio.
 *
 * The target is an archival comms broadcast played over the visuals: a
 * band-limited voice, lightly driven, sitting on a bed of static and
 * carrier hum, with squelch on each transmission open and close.
 *
 * ── Signal chain ─────────────────────────────────────────────────────
 *   voice ──▶ highpass 280 ──▶ lowpass 3200 ──▶ drive ──▶ presence ──┐
 *   static ─▶ bandpass 1200 ─────────────────────────────────────────┤
 *   hum ────▶ 60Hz + 120Hz ──────────────────────────────────────────┼─▶ master ─▶ out
 *   squelch ─▶ noise burst ──────────────────────────────────────────┘
 *
 * The 280–3200 Hz window is what makes a voice read as radio rather than
 * as a podcast; it is roughly the passband of real voice comms hardware.
 *
 * ── Voice source ─────────────────────────────────────────────────────
 * If a recording exists at `/audio/<recId>.mp3` it is used and routed
 * through the full chain. If not, the Web Speech API is used as a
 * stand-in. Speech synthesis output cannot be routed through Web Audio in
 * any current browser, so in fallback mode the voice is unfiltered while
 * the static bed and hum still play underneath. Dropping real files into
 * `public/audio/` upgrades the whole thing with no code change.
 *
 * Nothing starts without a user gesture. Audio is opt-in, always.
 */

export type TransmissionState = 'idle' | 'ready' | 'speaking';

interface RecordAudio {
  id: string;
  lines: string[];
}

class Transmission {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voiceIn: GainNode | null = null;
  private staticGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private levelData: Uint8Array<ArrayBuffer> | null = null;

  private el: HTMLAudioElement | null = null;
  private elSource: MediaElementAudioSourceNode | null = null;

  private enabled = false;
  private unlocked = false;
  private spokenRecords = new Set<string>();
  private currentId: string | null = null;
  private lastClick = 0;
  private usingSynth = false;

  /** Files the caller has confirmed exist, so we skip failed loads. */
  private availableFiles = new Set<string>();
  private probed = false;

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Must be called from a real user gesture. */
  async unlock(): Promise<void> {
    if (this.unlocked) {
      await this.ctx?.resume();
      return;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    this.analyser = analyser;
    this.levelData = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser);
    analyser.connect(ctx.destination);
    this.master = master;

    // ── voice chain ──
    const voiceIn = ctx.createGain();
    voiceIn.gain.value = 1.35;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 280;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    // Gentle asymmetric drive; enough to suggest a saturated transmitter
    // without turning consonants into fuzz.
    const drive = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.1) * 0.82;
    }
    drive.curve = curve;
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 1900;
    presence.Q.value = 0.9;
    presence.gain.value = 4.5;

    voiceIn.connect(hp);
    hp.connect(lp);
    lp.connect(drive);
    drive.connect(presence);
    presence.connect(master);
    this.voiceIn = voiceIn;

    // ── static bed ──
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    let lastSample = 0;
    for (let i = 0; i < nd.length; i++) {
      // Lightly low-passed noise reads as air rather than as hiss.
      const white = Math.random() * 2 - 1;
      lastSample = lastSample * 0.72 + white * 0.28;
      nd[i] = lastSample * 0.9;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const nbp = ctx.createBiquadFilter();
    nbp.type = 'bandpass';
    nbp.frequency.value = 1200;
    nbp.Q.value = 0.55;
    const staticGain = ctx.createGain();
    staticGain.gain.value = 0.014;
    noise.connect(nbp);
    nbp.connect(staticGain);
    staticGain.connect(master);
    noise.start();
    this.staticGain = staticGain;

    // ── carrier hum ──
    const humGain = ctx.createGain();
    humGain.gain.value = 0.012;
    for (const [freq, level] of [
      [60, 1],
      [120, 0.45],
      [180, 0.15],
    ] as [number, number][]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(humGain);
      osc.start();
    }
    humGain.connect(master);
    this.humGain = humGain;

    this.unlocked = true;
    await ctx.resume();
  }

  /** Check once which recordings actually exist. */
  private async probe(ids: string[]): Promise<void> {
    if (this.probed) return;
    this.probed = true;
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/audio/${id}.mp3`, { method: 'HEAD' });
          if (res.ok) this.availableFiles.add(id);
        } catch {
          /* absent; synth fallback will handle it */
        }
      }),
    );
  }

  async setEnabled(on: boolean, recordIds: string[] = []): Promise<void> {
    this.enabled = on;
    if (on) {
      await this.unlock();
      await this.probe(recordIds);
      this.ramp(this.master, 0.9, 0.6);
      this.squelch();
    } else {
      this.stopVoice();
      this.ramp(this.master, 0, 0.35);
    }
  }

  private ramp(node: GainNode | null, to: number, seconds: number): void {
    if (!node || !this.ctx) return;
    const now = this.ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(to, now + seconds);
  }

  /** Short filtered noise burst: a transmission opening or closing. */
  squelch(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.enabled) return;
    const dur = 0.09;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = 1 - i / d.length;
      d[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1650;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start();
  }

  /** Very short click, used for printed characters. */
  keyClick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.enabled) return;
    // Throttled hard: at full printing speed an unthrottled click train
    // stops reading as a mechanism and turns into a buzz.
    const now = ctx.currentTime;
    if (now - this.lastClick < 0.07) return;
    this.lastClick = now;

    const dur = 0.014;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600 + Math.random() * 700;
    bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start();
  }

  /** Begin narration for a record. No-ops if already read. */
  async speak(record: RecordAudio): Promise<void> {
    if (!this.enabled || !record.lines.length) return;
    if (this.currentId === record.id) return;
    if (this.spokenRecords.has(record.id)) return;

    this.stopVoice();
    this.currentId = record.id;
    this.spokenRecords.add(record.id);
    this.squelch();

    if (this.availableFiles.has(record.id)) {
      await this.playFile(record.id);
    } else {
      this.playSynth(record.lines);
    }
  }

  private async playFile(id: string): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.voiceIn) return;
    const el = new Audio(`/audio/${id}.mp3`);
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    this.el = el;
    const source = ctx.createMediaElementSource(el);
    source.connect(this.voiceIn);
    this.elSource = source;
    el.addEventListener('ended', () => this.squelch(), { once: true });
    try {
      await el.play();
    } catch {
      /* blocked; leave silent rather than throwing into the scroll loop */
    }
  }

  private playSynth(lines: string[]): void {
    const synth = window.speechSynthesis;
    if (!synth) return;
    this.usingSynth = true;
    const text = lines.join(' ');
    const u = new SpeechSynthesisUtterance(text);
    // Measured, official, unhurried. Not dramatic.
    u.rate = 0.92;
    u.pitch = 0.85;
    u.volume = 1;
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /en-GB/.test(v.lang) && /male|daniel|arthur/i.test(v.name)) ??
      voices.find((v) => /en-GB/.test(v.lang)) ??
      voices.find((v) => /en-US/.test(v.lang)) ??
      voices[0];
    if (preferred) u.voice = preferred;
    u.addEventListener('end', () => this.squelch());
    synth.speak(u);
  }

  stopVoice(): void {
    if (this.el) {
      this.el.pause();
      this.el.src = '';
      this.elSource?.disconnect();
      this.el = null;
      this.elSource = null;
    }
    if (this.usingSynth) {
      window.speechSynthesis?.cancel();
    }
    this.currentId = null;
  }

  /**
   * Couple the noise bed to signal strength.
   *
   * As the reported signal falls the static comes up and the carrier hum
   * thins out, so REC 06 sounds like a channel with nothing on it rather
   * than simply a quiet one.
   */
  setAtmosphere(signal: number): void {
    if (!this.ctx || !this.enabled) return;
    const s = Math.max(0, Math.min(1, signal));
    this.ramp(this.staticGain, 0.008 + (1 - s) * 0.03, 0.9);
    this.ramp(this.humGain, 0.004 + s * 0.014, 0.9);
  }

  /** 0..1 output level, for the meter in the control. */
  level(): number {
    if (!this.analyser || !this.levelData || !this.enabled) return 0;
    this.analyser.getByteFrequencyData(this.levelData);
    let sum = 0;
    for (let i = 0; i < this.levelData.length; i++) sum += this.levelData[i];
    return Math.min(1, sum / this.levelData.length / 90);
  }

  /** Allow a record to be narrated again. */
  reset(): void {
    this.spokenRecords.clear();
    this.currentId = null;
  }
}

export const transmission = new Transmission();
