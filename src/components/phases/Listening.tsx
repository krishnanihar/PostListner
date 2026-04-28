'use client';

/**
 * Phase 9 — Orchestra. The conducting + dissolution arc.
 *
 * Plays the per-session generated track (or, in offline / fallback mode,
 * the pre-rendered audition file for the matched variation) through a
 * Web Audio graph that supports:
 *
 *   • HRTF spatial panning via PannerNode (`panningModel = 'HRTF'`)
 *   • Per-source lowpass filter (gesture-controlled brightness)
 *   • Dry / wet split with synthesized convolution reverb
 *   • Master gain envelope across the dissolution arc
 *   • DeviceOrientation + DeviceMotion gesture mapping with iOS
 *     permission flow, low-pass smoothing, and a pointer fallback
 *
 * A six-section automation timeline drives the macro arc per
 * Research/ego-dissolution-postlistener-architecture: threshold → release
 * → peak → return → homecoming → silence. Gesture biases the section's
 * baseline parameters within bounded deltas — the user shapes the piece,
 * the piece is already shaping itself.
 *
 * Conducting visual: an AnalyserNode samples the playing signal each
 * frame; transient onsets above an adaptive threshold deposit Downbeat
 * marks on one of four staves, bucketed by spectral centroid. This is
 * NOT real 4-stem separation — it is a visual proxy until the HTDemucs
 * pipeline lands. The four staves are labeled `vocals · drums · bass ·
 * other` and the bucketing reflects rough frequency bands.
 */

import { useEffect, useRef, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Downbeat } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { resolveSelection } from '@/lib/scoring';

const STEM_NAMES = ['vocals', 'drums', 'bass', 'other'];
const STEM_Y = [200, 290, 380, 470];

/** Six-section dissolution timeline. Times in ms relative to playback start. */
interface Section {
  key: string;
  start: number;
  end: number;
  /** Panner X target in normalized units (-1.5..1.5; 0 = center). Drift width. */
  panDriftWidth: number;
  /** Panner drift period in seconds — how slowly the spatial position rotates. */
  panDriftPeriod: number;
  /** Lowpass cutoff baseline in Hz. Gesture biases ± an octave. */
  filterHz: number;
  /** Wet (reverb) mix, 0..1. */
  wetMix: number;
  /** Master gain baseline, 0..1.05. */
  masterGain: number;
  /** Detune in cents applied via playbackRate (10c ~ 0.0058 rate offset). */
  detuneCents: number;
}

const SECTIONS: Section[] = [
  { key: 'threshold',   start:      0, end:  30_000, panDriftWidth: 0.3, panDriftPeriod: 18, filterHz: 8000, wetMix: 0.05, masterGain: 0.85, detuneCents:  0 },
  { key: 'release',     start: 30_000, end:  75_000, panDriftWidth: 1.0, panDriftPeriod: 12, filterHz: 4000, wetMix: 0.25, masterGain: 0.90, detuneCents:  8 },
  { key: 'peak',        start: 75_000, end: 120_000, panDriftWidth: 1.5, panDriftPeriod:  9, filterHz: 1500, wetMix: 0.70, masterGain: 0.95, detuneCents: 22 },
  { key: 'return',      start:120_000, end: 150_000, panDriftWidth: 0.8, panDriftPeriod: 11, filterHz: 3500, wetMix: 0.40, masterGain: 0.95, detuneCents: 10 },
  { key: 'homecoming',  start:150_000, end: 170_000, panDriftWidth: 0.2, panDriftPeriod: 14, filterHz: 6000, wetMix: 0.15, masterGain: 0.90, detuneCents:  0 },
  { key: 'silence',     start:170_000, end: 180_000, panDriftWidth: 0.0, panDriftPeriod: 14, filterHz: 5000, wetMix: 0.10, masterGain: 0.00, detuneCents:  0 },
];
const ARC_TOTAL_MS = SECTIONS[SECTIONS.length - 1].end;

/** Linear interpolation, clamped to [0,1] on t. */
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/**
 * Synthesize a small-room impulse response on an OfflineAudioContext —
 * exponential-decay noise burst, mono → stereo. ~0.6s decay, gentle
 * lowpass coloring. Cached on the AudioContext after first build.
 */
async function buildRoomIR(ctx: AudioContext): Promise<AudioBuffer> {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * 0.6);
  const ir = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const decay = Math.pow(1 - t, 2.2);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return ir;
}

interface EngineOpts {
  url: string;
  onArcEnd: () => void;
  onOnset: (stemIdx: number) => void;
}

/** All Web Audio + gesture state lives in this engine. React owns its lifecycle. */
class ListeningEngine {
  private ctx: AudioContext | null = null;
  private audio: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private panner: PannerNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rafId = 0;
  private startedAt = 0;
  private running = false;

  // Smoothed gesture state.
  private gRoll = 0;   // -1..1
  private gPitch = 0;  // -1..1
  private gAccel = 0;  // 0..1
  // Last raw values from event listeners; smoothing happens in tick.
  private rawRoll = 0;
  private rawPitch = 0;
  private rawAccel = 0;
  // Pointer fallback (used while gesture is unavailable).
  private pointerRoll = 0;
  private pointerPitch = 0;
  private gestureActive = false;

  // Onset-detection state.
  private prevRMS = 0;
  private onsetCooldown = 0;
  private freqBuf: Uint8Array<ArrayBuffer> | null = null;
  private timeBuf: Uint8Array<ArrayBuffer> | null = null;

  constructor(private opts: EngineOpts) {}

  async start() {
    if (this.running) return;
    type AC = typeof AudioContext;
    const Ctx: AC | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

    const audio = new Audio(this.opts.url);
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.preload = 'auto';

    const source = ctx.createMediaElementSource(audio);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = SECTIONS[0].filterHz;
    filter.Q.value = 0.7;

    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 1 - SECTIONS[0].wetMix;
    wetGain.gain.value = SECTIONS[0].wetMix;

    const convolver = ctx.createConvolver();
    convolver.buffer = await buildRoomIR(ctx);

    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10;
    panner.rolloffFactor = 1;
    panner.positionX.value = 0;
    panner.positionY.value = 0;
    panner.positionZ.value = -1;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;
    this.freqBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    this.timeBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));

    // Graph: source → filter → split (dry|wet→convolver) → sum → panner →
    // masterGain → destination, with analyser tapped off the master so the
    // onset visual reflects what the listener actually hears.
    source.connect(filter);
    filter.connect(dryGain);
    filter.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(panner);
    wetGain.connect(panner);
    panner.connect(masterGain);
    masterGain.connect(analyser);
    masterGain.connect(ctx.destination);

    // Fade master in over 1.2s to the section baseline.
    masterGain.gain.linearRampToValueAtTime(SECTIONS[0].masterGain, ctx.currentTime + 1.2);

    await audio.play().catch(() => {});

    this.ctx = ctx;
    this.audio = audio;
    this.source = source;
    this.filter = filter;
    this.dryGain = dryGain;
    this.wetGain = wetGain;
    this.convolver = convolver;
    this.panner = panner;
    this.masterGain = masterGain;
    this.analyser = analyser;
    this.startedAt = performance.now();
    this.running = true;
    this.attachGestureListeners();
    this.tick();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.detachGestureListeners();
    try {
      if (this.masterGain && this.ctx) {
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
        this.masterGain.gain.linearRampToValueAtTime(0, t + 0.4);
      }
    } catch {}
    try { this.audio?.pause(); } catch {}
    window.setTimeout(() => {
      try { this.ctx?.close(); } catch {}
    }, 600);
  }

  /** Pointer fallback — called by the React component on pointer move. */
  setPointer(nx: number, ny: number) {
    if (this.gestureActive) return; // device gesture wins
    this.pointerRoll = nx * 2 - 1;       // -1..1
    this.pointerPitch = 1 - ny * 2;      //  1..-1 (top = bright)
  }

  private attachGestureListeners = () => {
    if (typeof window === 'undefined') return;
    window.addEventListener('deviceorientation', this.onOrient as EventListener);
    window.addEventListener('devicemotion', this.onMotion as EventListener);
  };

  private detachGestureListeners = () => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('deviceorientation', this.onOrient as EventListener);
    window.removeEventListener('devicemotion', this.onMotion as EventListener);
  };

  private onOrient = (e: DeviceOrientationEvent) => {
    if (e.gamma == null && e.beta == null) return;
    this.gestureActive = true;
    // gamma: -90..90 (roll, left/right tilt). beta: -180..180 (pitch).
    this.rawRoll = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 60));
    const pitchDeg = e.beta ?? 0;
    // Comfortable hand-held range: 0..90 → -1..1.
    this.rawPitch = Math.max(-1, Math.min(1, (pitchDeg - 45) / 45));
  };

  private onMotion = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity ?? e.acceleration;
    if (!a) return;
    this.gestureActive = true;
    // Rough magnitude minus gravity baseline ~9.81. Normalize to 0..1.
    const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
    this.rawAccel = Math.max(0, Math.min(1, (mag - 9) / 6));
  };

  /** Currently-active section index based on elapsed playback time. */
  private currentSection(elapsed: number): { idx: number; t: number; sec: Section; next: Section } {
    let idx = 0;
    for (let i = 0; i < SECTIONS.length; i++) {
      if (elapsed < SECTIONS[i].end) { idx = i; break; }
      idx = i;
    }
    const sec = SECTIONS[idx];
    const next = SECTIONS[Math.min(idx + 1, SECTIONS.length - 1)];
    const span = sec.end - sec.start;
    const t = span > 0 ? (elapsed - sec.start) / span : 1;
    return { idx, t, sec, next };
  }

  private tick = () => {
    this.rafId = requestAnimationFrame(this.tick);
    if (!this.running || !this.ctx) return;

    const elapsed = performance.now() - this.startedAt;

    if (elapsed >= ARC_TOTAL_MS) {
      this.opts.onArcEnd();
      return;
    }

    // Smooth gesture (single-pole low-pass; α tuned for ~10Hz settling).
    const ALPHA = 0.18;
    const useDevice = this.gestureActive;
    const targetRoll = useDevice ? this.rawRoll : this.pointerRoll;
    const targetPitch = useDevice ? this.rawPitch : this.pointerPitch;
    const targetAccel = useDevice ? this.rawAccel : 0;
    this.gRoll  += ALPHA * (targetRoll  - this.gRoll);
    this.gPitch += ALPHA * (targetPitch - this.gPitch);
    this.gAccel += ALPHA * (targetAccel - this.gAccel);

    // Compute section blend (cross-fade across the last 1.5s of each section).
    const { sec, next } = this.currentSection(elapsed);
    const blendStart = sec.end - 1500;
    const blendT = elapsed > blendStart ? Math.min(1, (elapsed - blendStart) / 1500) : 0;

    const lerpSec = (a: number, b: number) => lerp(a, b, blendT);
    const baseFilter = lerpSec(sec.filterHz, next.filterHz);
    const baseWet = lerpSec(sec.wetMix, next.wetMix);
    const baseMaster = lerpSec(sec.masterGain, next.masterGain);
    const driftWidth = lerpSec(sec.panDriftWidth, next.panDriftWidth);
    const driftPeriod = lerpSec(sec.panDriftPeriod, next.panDriftPeriod);
    const detuneCents = lerpSec(sec.detuneCents, next.detuneCents);

    // Section-driven slow spatial drift — sinusoidal sweep around 0.
    const sweep = Math.sin((elapsed / 1000 / Math.max(1, driftPeriod)) * Math.PI * 2);
    const panBase = sweep * driftWidth;

    // Gesture deltas, bounded so the section's macro shape always reads.
    const panFinal = Math.max(-2, Math.min(2, panBase + this.gRoll * 1.2));
    const filterFinal = Math.max(
      400,
      Math.min(14000, baseFilter * Math.pow(2, this.gPitch * 1.0))
    );
    const masterFinal = Math.max(0, Math.min(1.05, baseMaster + this.gAccel * 0.08));

    // Apply to nodes — set values directly (ramps would compound at 60Hz).
    const t = this.ctx.currentTime;
    const SMOOTH = 0.05;
    if (this.panner) {
      this.panner.positionX.setTargetAtTime(panFinal, t, SMOOTH);
      this.panner.positionZ.setTargetAtTime(-1, t, SMOOTH);
    }
    if (this.filter) this.filter.frequency.setTargetAtTime(filterFinal, t, SMOOTH);
    if (this.dryGain) this.dryGain.gain.setTargetAtTime(1 - baseWet, t, SMOOTH);
    if (this.wetGain) this.wetGain.gain.setTargetAtTime(baseWet, t, SMOOTH);
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(masterFinal, t, SMOOTH);

    // Detune via playbackRate. ±25c ≈ playbackRate × 2^(c/1200) → ±~0.014.
    if (this.audio) {
      this.audio.playbackRate = Math.pow(2, detuneCents / 1200);
    }

    // Onset detection on the analyser stream.
    if (this.analyser && this.timeBuf && this.freqBuf) {
      this.analyser.getByteTimeDomainData(this.timeBuf);
      this.analyser.getByteFrequencyData(this.freqBuf);
      // RMS in 0..1 (signal centered at 128).
      let sumSq = 0;
      for (let i = 0; i < this.timeBuf.length; i++) {
        const v = (this.timeBuf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / this.timeBuf.length);
      const delta = rms - this.prevRMS;
      this.prevRMS = rms;
      this.onsetCooldown = Math.max(0, this.onsetCooldown - 1);
      if (this.onsetCooldown === 0 && delta > 0.04 && rms > 0.06) {
        this.onsetCooldown = 8; // ~130ms at 60fps minimum gap
        // Spectral centroid bucket → stem index.
        let weighted = 0, total = 0;
        for (let i = 0; i < this.freqBuf.length; i++) {
          const v = this.freqBuf[i];
          weighted += i * v;
          total += v;
        }
        const centroidBin = total > 0 ? weighted / total : 0;
        const fraction = centroidBin / this.freqBuf.length; // 0..1
        let stemIdx = 3; // 'other' default
        if (fraction < 0.08) stemIdx = 2;       // bass
        else if (fraction < 0.20) stemIdx = 1;  // drums (kick body / snare)
        else if (fraction < 0.45) stemIdx = 0;  // vocals (mid)
        this.opts.onOnset(stemIdx);
      }
    }
  };
}

export function Listening() {
  const setPhase = useStore((s) => s.setPhase);
  const sessionTrackUrl = useStore((s) => s.sessionTrackUrl);
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const songYears = useStore((s) => s.songYears);
  const tapBPM = useStore((s) => s.tapBPM);

  // Resolve playback URL: prefer the per-session track Wait stored,
  // otherwise fall back to the variation's audition file.
  const fallbackSel = resolveSelection({
    pairChoices,
    pairLatencies,
    emotionTiles,
    songYears,
    tapBPM,
    epsilon: 0,
  });
  const playUrl =
    sessionTrackUrl ??
    (fallbackSel ? `/audio/audition/${fallbackSel.variation.id}.mp3` : null);

  const engineRef = useRef<ListeningEngine | null>(null);
  const [started, setStarted] = useState(false);
  const [needsIosPerm, setNeedsIosPerm] = useState(false);
  const [section, setSection] = useState(0);
  const [taps, setTaps] = useState<{ stem: number; x: number; bornAt: number }[]>([]);
  const tapsBornRef = useRef(0);

  // Detect if we'll need to ask iOS for motion permission. The class on
  // DeviceOrientationEvent is iOS Safari-specific.
  useEffect(() => {
    const w = window as unknown as {
      DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
    };
    if (typeof w.DeviceOrientationEvent?.requestPermission === 'function') {
      setNeedsIosPerm(true);
    }
  }, []);

  // Track which section the timeline is currently in (purely for the UI
  // footer crumb; the engine itself owns playback timing).
  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const elapsed = performance.now() - start;
      let idx = 0;
      for (let i = 0; i < SECTIONS.length; i++) {
        if (elapsed < SECTIONS[i].end) { idx = i; break; }
        idx = i;
      }
      setSection(idx);
    }, 200);
    return () => clearInterval(id);
  }, [started]);

  // Tap deposits decay after a few seconds so the page never crowds.
  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const now = performance.now();
      setTaps((prev) => prev.filter((t) => now - t.bornAt < 6500));
    }, 500);
    return () => clearInterval(id);
  }, [started]);

  // Engine lifecycle. Created on user gesture (begin), destroyed on unmount.
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
      // Revoke the blob URL we created in Wait (if any).
      if (sessionTrackUrl && sessionTrackUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(sessionTrackUrl); } catch {}
      }
    };
  }, [sessionTrackUrl]);

  const handleOnset = (stemIdx: number) => {
    tapsBornRef.current += 1;
    // Stagger x along the stave by accumulating; modulo the stave width so
    // the ink wraps gracefully if the section runs long.
    const span = VB_W - MARGIN_X * 2;
    const x = MARGIN_X + ((tapsBornRef.current * 7) % span);
    setTaps((prev) => {
      const next = [...prev, { stem: stemIdx, x, bornAt: performance.now() }];
      // Cap retained marks to avoid render slowdown.
      return next.length > 80 ? next.slice(next.length - 80) : next;
    });
  };

  const begin = async () => {
    if (!playUrl) {
      // No source — skip silently to Silence.
      setPhase(10);
      return;
    }
    // Ask iOS for motion permission if applicable. Failure is fine — the
    // pointer fallback covers desktop and denied-permission cases.
    if (needsIosPerm) {
      try {
        const w = window as unknown as {
          DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
          DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
        };
        await w.DeviceOrientationEvent?.requestPermission?.().catch(() => null);
        await w.DeviceMotionEvent?.requestPermission?.().catch(() => null);
      } catch {}
    }
    const engine = new ListeningEngine({
      url: playUrl,
      onArcEnd: () => setPhase(10),
      onOnset: handleOnset,
    });
    engineRef.current = engine;
    await engine.start();
    setStarted(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!engineRef.current) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    engineRef.current.setPointer(
      Math.max(0, Math.min(1, nx)),
      Math.max(0, Math.min(1, ny))
    );
  };

  return (
    <div onPointerMove={(e) => onPointerMove(e as unknown as React.PointerEvent<SVGSVGElement>)}
         style={{ width: '100%', height: '100%' }}>
      <Score
        variant="cream"
        pageTitle="ix. orchestra"
        pageNumber="—"
        voiceCue={started ? 'hold the phone like a baton' : ''}
        footer={
          started
            ? `conducting · ${SECTIONS[section]?.key ?? ''} · gesture + hrtf`
            : 'conducting · 4 stems · gesture · hrtf'
        }
        staves={STEM_Y.map((y) => ({ y }))}
      >
        {STEM_NAMES.map((name, i) => (
          <text
            key={name}
            x={MARGIN_X - 6}
            y={STEM_Y[i] + 8}
            fill={COLORS.inkCreamSecondary}
            fontSize="9"
            fontFamily="var(--font-mono)"
            textAnchor="end"
            letterSpacing="0.18em"
          >
            {name}
          </text>
        ))}

        {taps.map((t, i) => {
          const age = (performance.now() - t.bornAt) / 6500;
          const opacity = Math.max(0, 1 - age) * 0.85;
          return (
            <g key={`${t.bornAt}-${i}`} transform={`translate(${t.x}, ${STEM_Y[t.stem] + 6})`} opacity={opacity}>
              <Downbeat size={4} color={COLORS.inkCream} opacity={1} />
            </g>
          );
        })}
      </Score>

      {!started && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: 'rgba(242, 235, 216, 0.86)',
            backdropFilter: 'blur(2px)',
            gap: 20,
          }}
        >
          <p
            style={{
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontSize: 18,
              color: COLORS.inkCream,
              textAlign: 'center',
              maxWidth: 280,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            put the headphones on. tilt the phone like a baton.
          </p>
          <button
            type="button"
            onClick={begin}
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: '0.2em',
              padding: '12px 22px',
              background: 'transparent',
              color: COLORS.inkCream,
              border: `0.6px solid ${COLORS.inkCream}`,
              borderRadius: 0,
              cursor: 'pointer',
            }}
            disabled={!playUrl}
          >
            {playUrl ? 'BEGIN' : 'NO SIGNAL'}
          </button>
          {needsIosPerm && (
            <p
              style={{
                fontFamily: FONTS.mono,
                fontSize: 9,
                letterSpacing: '0.18em',
                color: COLORS.inkCreamSecondary,
                textAlign: 'center',
                maxWidth: 260,
                lineHeight: 1.7,
                opacity: 0.7,
                margin: 0,
              }}
            >
              ios will ask for motion access. allow it for the baton.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
