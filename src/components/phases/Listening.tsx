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
import { AdmirerLine } from '@/components/AdmirerLine';
import { DissolutionLayers } from '@/lib/dissolutionLayers';

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
  /** 0 = full gesture-to-sound exclusivity. 1 = orchestra fully autonomous. */
  exclusivityBroken: number;
  /** 0 = consistent gesture mapping. 1 = mapping fully scrambled. */
  consistencyBroken: number;
  /** Delay between gesture and effect, in ms. 0 = immediate. 1000+ = decoupled. */
  priorityDelayMs: number;
  /** 0 = clean. 1 = max chorus-style timbral blur via fast LFO on filter. */
  timbralBlur: number;
  /** Per-stem temporal offset applied at section start, in ms. Bregman onset-synchrony cue. */
  onsetOffsetMs?: number;
}

const SECTIONS: Section[] = [
  // 0:00–1:00 — threshold. Conducting still works; orchestra introduces autonomous behaviors.
  { key: 'threshold',  start:       0, end:  60_000, panDriftWidth: 0.3, panDriftPeriod: 18, filterHz: 8000, wetMix: 0.05, masterGain: 0.85, detuneCents:  0, exclusivityBroken: 0.15, consistencyBroken: 0.00, priorityDelayMs:    0, timbralBlur: 0.00, onsetOffsetMs:  0 },
  // 1:00–2:30 — release. Onset offsets begin; common fate diverges; spatial widens.
  { key: 'release',    start:  60_000, end: 150_000, panDriftWidth: 1.0, panDriftPeriod: 12, filterHz: 4500, wetMix: 0.30, masterGain: 0.90, detuneCents:  6, exclusivityBroken: 0.45, consistencyBroken: 0.30, priorityDelayMs:    0, timbralBlur: 0.15, onsetOffsetMs: 30 },
  // 2:30–3:30 — peak. Bregman fully degraded; Wegner priority broken; ego-loosening peak.
  { key: 'peak',       start: 150_000, end: 210_000, panDriftWidth: 1.5, panDriftPeriod:  9, filterHz: 1500, wetMix: 0.70, masterGain: 0.92, detuneCents: 22, exclusivityBroken: 0.85, consistencyBroken: 0.85, priorityDelayMs: 1200, timbralBlur: 0.55, onsetOffsetMs: 80 },
  // 3:30–4:30 — return. Inverse Bregman; agency briefly reappears as a gift.
  { key: 'return',     start: 210_000, end: 270_000, panDriftWidth: 0.6, panDriftPeriod: 11, filterHz: 3500, wetMix: 0.40, masterGain: 0.93, detuneCents:  8, exclusivityBroken: 0.50, consistencyBroken: 0.40, priorityDelayMs:  600, timbralBlur: 0.20, onsetOffsetMs: 40 },
  // 4:30–5:30 — homecoming. Plagal warmth; gesture re-engages briefly.
  { key: 'homecoming', start: 270_000, end: 330_000, panDriftWidth: 0.2, panDriftPeriod: 14, filterHz: 6500, wetMix: 0.18, masterGain: 0.90, detuneCents:  0, exclusivityBroken: 0.10, consistencyBroken: 0.05, priorityDelayMs:    0, timbralBlur: 0.05, onsetOffsetMs:  0 },
  // 5:30–6:00 — silence. Master ramps to 0; advance phase 10.
  { key: 'silence',    start: 330_000, end: 360_000, panDriftWidth: 0.0, panDriftPeriod: 14, filterHz: 5000, wetMix: 0.10, masterGain: 0.00, detuneCents:  0, exclusivityBroken: 0.00, consistencyBroken: 0.00, priorityDelayMs:    0, timbralBlur: 0.00, onsetOffsetMs:  0 },
];
const ARC_TOTAL_MS = SECTIONS[SECTIONS.length - 1].end;

/**
 * Gentle-path softening: when the listener flagged any screening question,
 * soften only the peak section so the dissolution apex is less intense
 * (less detune, less reverb, less timbral blur, less agency-break).
 * Other sections stay identical.
 */
function softenSections(secs: Section[]): Section[] {
  return secs.map((s) => {
    if (s.key !== 'peak') return s;
    return {
      ...s,
      detuneCents: s.detuneCents * 0.4,
      wetMix: Math.min(0.45, s.wetMix),
      timbralBlur: (s.timbralBlur ?? 0) * 0.5,
      consistencyBroken: s.consistencyBroken * 0.5,
      priorityDelayMs: s.priorityDelayMs * 0.5,
      exclusivityBroken: s.exclusivityBroken * 0.6,
    };
  });
}

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
  stemUrls?: { vocals: string; drums: string; bass: string; other: string } | null;
  gentlePath?: boolean;
  onArcEnd: () => void;
  onOnset: (stemIdx: number) => void;
  /**
   * Pre-primed AudioContext from the click handler. iOS Safari requires
   * AudioContext.resume() to ride the user-gesture token, so the React
   * component creates the ctx synchronously in `begin()` before any awaits
   * and hands it in here.
   */
  ctx?: AudioContext | null;
}

/**
 * Create + resume an AudioContext synchronously on a user gesture. iOS Safari
 * burns the gesture token across `await`, so callers must invoke this from
 * the click handler before any `await`. Returns null on browsers without
 * Web Audio (the engine then no-ops).
 */
function primeAudioContext(): AudioContext | null {
  type AC = typeof AudioContext;
  const Ctx: AC | undefined =
    typeof window !== 'undefined'
      ? window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext
      : undefined;
  if (!Ctx) return null;
  const ctx = new Ctx();
  // Fire-and-forget — resume() is async but we don't need to await it; the
  // gesture authorization travels with the call itself, not the promise.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
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
  private layers: DissolutionLayers | null = null;
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

  // Wegner priority: queue raw inputs and consume them N frames later (60fps frame budget).
  private rollQueue: number[] = [];
  private pitchQueue: number[] = [];
  private accelQueue: number[] = [];

  // Multi-stem HRTF chains. Empty when stems aren't available — the single-source
  // path (this.source/filter/dryGain/wetGain/panner) covers that case as graceful fallback.
  private stemNodes: Array<{
    audio: HTMLAudioElement;
    source: MediaElementAudioSourceNode;
    filter: BiquadFilterNode;
    dryGain: GainNode;
    wetGain: GainNode;
    panner: PannerNode;
    analyser: AnalyserNode;
    prevRMS: number;
    cooldown: number;
    timeBuf: Uint8Array<ArrayBuffer>;
  }> = [];
  // Bregman onset-synchrony: only re-seek per-stem currentTime at section transitions.
  private lastSectionIdx = -1;

  // Per-instance section table — softened if gentlePath is on. ARC_TOTAL_MS still
  // derives from the master SECTIONS constant (silence end is fixed regardless).
  private sections: Section[];

  constructor(private opts: EngineOpts) {
    this.sections = opts.gentlePath ? softenSections(SECTIONS) : SECTIONS;
  }

  async start() {
    if (this.running) return;
    // Prefer the pre-primed context handed in from the click handler; only
    // construct one ourselves as a desktop / non-iOS fallback. Either way,
    // resume() is best-effort — iOS will silently fail to resume if no
    // gesture token is alive.
    let ctx = this.opts.ctx ?? null;
    if (!ctx) ctx = primeAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

    const convolver = ctx.createConvolver();
    convolver.buffer = await buildRoomIR(ctx);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;
    this.freqBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    this.timeBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));

    // Branch on stem availability: the multi-source HRTF graph gives each stem its
    // own filter/dry-wet/panner chain so they can scatter spatially and temporally.
    // The single-source path is graceful-degradation fallback when stems aren't ready.
    if (this.opts.stemUrls) {
      // Wet path needs convolver→destination wiring once; per-stem wetGain feeds
      // the per-stem panner directly (see buildStemChains), so the convolver is
      // shared but its output is already attached to each panner via wetGain.
      // Wire convolver's output into the master path here so the wet bus reaches
      // the destination through masterGain's envelope.
      // (Note: the wet share is summed at each per-stem panner, so we don't need
      // a separate convolver→masterGain wire here.)
      await this.buildStemChains(ctx, this.opts.stemUrls, convolver, masterGain);
    } else {
      const audio = new Audio(this.opts.url);
      audio.crossOrigin = 'anonymous';
      audio.loop = true;
      audio.preload = 'auto';

      const source = ctx.createMediaElementSource(audio);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.sections[0].filterHz;
      filter.Q.value = 0.7;

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 1 - this.sections[0].wetMix;
      wetGain.gain.value = this.sections[0].wetMix;

      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10;
      panner.rolloffFactor = 1;
      panner.positionX.value = 0;
      panner.positionY.value = 0;
      panner.positionZ.value = -1;

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

      await audio.play().catch(() => {});

      this.audio = audio;
      this.source = source;
      this.filter = filter;
      this.dryGain = dryGain;
      this.wetGain = wetGain;
      this.panner = panner;
    }

    masterGain.connect(analyser);
    masterGain.connect(ctx.destination);

    // Fade master in over 1.2s to the section baseline.
    masterGain.gain.linearRampToValueAtTime(this.sections[0].masterGain, ctx.currentTime + 1.2);

    // Sub-bass drone + theta binaural layers — connected into the master path
    // so they ride the section's masterGain envelope (fades in/out across the arc).
    this.layers = new DissolutionLayers(ctx, masterGain);

    this.ctx = ctx;
    this.convolver = convolver;
    this.masterGain = masterGain;
    this.analyser = analyser;
    this.startedAt = performance.now();
    this.running = true;
    this.attachGestureListeners();
    this.tick();
  }

  /**
   * Build four parallel HRTF chains, one per stem. Each stem carries its own
   * filter / dry+wet split / panner so per-stem position can scatter as the
   * dissolution arc progresses (Bregman spatial-coherence cue). The convolver
   * is shared — wet share is summed at each per-stem panner.
   */
  private async buildStemChains(
    ctx: AudioContext,
    stems: NonNullable<EngineOpts['stemUrls']>,
    convolver: ConvolverNode,
    masterGain: GainNode,
  ) {
    const STEM_BASE_POS: Record<keyof typeof stems, [number, number, number]> = {
      vocals: [ 0.0,  0.3, -1.0],
      drums:  [-0.6,  0.0, -0.8],
      bass:   [ 0.6,  0.0, -0.8],
      other:  [ 0.0, -0.3, -1.2],
    };
    for (const name of ['vocals', 'drums', 'bass', 'other'] as const) {
      const audio = new Audio(stems[name]);
      audio.crossOrigin = 'anonymous';
      audio.loop = false; // stems already cover the full arc
      audio.preload = 'auto';

      const source = ctx.createMediaElementSource(audio);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.sections[0].filterHz;
      filter.Q.value = 0.7;

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      dryGain.gain.value = 1 - this.sections[0].wetMix;
      wetGain.gain.value = this.sections[0].wetMix;

      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10;
      panner.rolloffFactor = 1;
      const [px, py, pz] = STEM_BASE_POS[name];
      panner.positionX.value = px;
      panner.positionY.value = py;
      panner.positionZ.value = pz;

      // source → filter → split (dry direct + wet through shared convolver) → panner → master
      source.connect(filter);
      filter.connect(dryGain);
      filter.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(panner);
      wetGain.connect(panner);
      panner.connect(masterGain);

      // Per-stem analyser tap pre-spatial — onsets reflect what was played, not where.
      // Acts as a sink (no downstream connection required).
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      filter.connect(analyser);

      await audio.play().catch(() => {});
      this.stemNodes.push({
        audio, source, filter, dryGain, wetGain, panner,
        analyser,
        prevRMS: 0,
        cooldown: 0,
        timeBuf: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
      });
    }
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.detachGestureListeners();
    this.layers?.stop();
    try {
      if (this.masterGain && this.ctx) {
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
        this.masterGain.gain.linearRampToValueAtTime(0, t + 0.4);
      }
    } catch {}
    try { this.audio?.pause(); } catch {}
    this.stemNodes.forEach((n) => { try { n.audio.pause(); } catch {} });
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
    for (let i = 0; i < this.sections.length; i++) {
      if (elapsed < this.sections[i].end) { idx = i; break; }
      idx = i;
    }
    const sec = this.sections[idx];
    const next = this.sections[Math.min(idx + 1, this.sections.length - 1)];
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

    // Compute section blend (cross-fade across the last 1.5s of each section).
    const { idx, sec, next } = this.currentSection(elapsed);
    this.layers?.setSection(sec.key as 'threshold' | 'release' | 'peak' | 'return' | 'homecoming' | 'silence');
    const blendStart = sec.end - 1500;
    const blendT = elapsed > blendStart ? Math.min(1, (elapsed - blendStart) / 1500) : 0;

    const lerpSec = (a: number, b: number) => lerp(a, b, blendT);
    const baseFilter = lerpSec(sec.filterHz, next.filterHz);
    const baseWet = lerpSec(sec.wetMix, next.wetMix);
    const baseMaster = lerpSec(sec.masterGain, next.masterGain);
    const driftWidth = lerpSec(sec.panDriftWidth, next.panDriftWidth);
    const driftPeriod = lerpSec(sec.panDriftPeriod, next.panDriftPeriod);
    const detuneCents = lerpSec(sec.detuneCents, next.detuneCents);

    const useDevice = this.gestureActive;

    // Wegner priority: queue raw inputs and consume them N frames later (60fps frame budget).
    // At break=0 the head of the queue is the live sample; as delay grows the user feels lag.
    const blendedDelayMs = lerpSec(sec.priorityDelayMs, next.priorityDelayMs);
    const delayFrames = Math.round(blendedDelayMs / 16.67); // 60fps
    this.rollQueue.push(useDevice ? this.rawRoll : this.pointerRoll);
    this.pitchQueue.push(useDevice ? this.rawPitch : this.pointerPitch);
    this.accelQueue.push(useDevice ? this.rawAccel : 0);
    const cap = Math.max(1, delayFrames + 1);
    while (this.rollQueue.length > cap) this.rollQueue.shift();
    while (this.pitchQueue.length > cap) this.pitchQueue.shift();
    while (this.accelQueue.length > cap) this.accelQueue.shift();
    const targetRoll = this.rollQueue[0];
    const targetPitch = this.pitchQueue[0];
    const targetAccel = this.accelQueue[0];

    // Smooth gesture (single-pole low-pass; α tuned for ~10Hz settling).
    // Longer priority delay → heavier smoothing so the lagged samples don't read as jitter.
    const ALPHA = blendedDelayMs > 200 ? 0.10 : 0.18;
    this.gRoll  += ALPHA * (targetRoll  - this.gRoll);
    this.gPitch += ALPHA * (targetPitch - this.gPitch);
    this.gAccel += ALPHA * (targetAccel - this.gAccel);

    // Wegner consistency: at break=1, roll drives filter and pitch drives pan — the user's intuition fails.
    const blendedConsistency = lerpSec(sec.consistencyBroken, next.consistencyBroken);
    const effectiveRoll = this.gRoll * (1 - blendedConsistency) + this.gPitch * blendedConsistency;
    const effectivePitch = this.gPitch * (1 - blendedConsistency) + this.gRoll * blendedConsistency;

    // Section-driven slow spatial drift — sinusoidal sweep around 0.
    const sweep = Math.sin((elapsed / 1000 / Math.max(1, driftPeriod)) * Math.PI * 2);
    const panBase = sweep * driftWidth;

    // Wegner exclusivity: at break=1, the orchestra has its own oscillator the user
    // did not cause. At break=0, gesture has full authority.
    const blendedExclusivity = lerpSec(sec.exclusivityBroken, next.exclusivityBroken);
    const autonomousPan = Math.sin((elapsed / 1000 / 7) * Math.PI * 2) * 0.6 * blendedExclusivity;
    const gestureWeight = 1 - blendedExclusivity * 0.6; // never fully zero — pointer fallback still feels alive

    // Gesture deltas, bounded so the section's macro shape always reads.
    const panFinal = Math.max(-2, Math.min(2, panBase + effectiveRoll * 1.2 * gestureWeight + autonomousPan));
    const blendedBlur = lerpSec(sec.timbralBlur, next.timbralBlur);
    const blurLfo = Math.sin((elapsed / 1000 * 7) * Math.PI * 2) * blendedBlur * 0.4; // ±0.4 octave at peak
    const filterFinal = Math.max(
      400,
      Math.min(14000, baseFilter * Math.pow(2, effectivePitch * 1.0 + blurLfo))
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

    // Per-stem macro updates — each stem orbits a different phase offset so
    // stems scatter spatially as panDriftWidth widens (Bregman spatial cue).
    // No-ops when stemNodes is empty (single-source path).
    const blendedSpatialScatter = lerpSec(sec.panDriftWidth, next.panDriftWidth);
    this.stemNodes.forEach((node, i) => {
      const orbit = Math.sin((elapsed / 1000 / 11) * Math.PI * 2 + i * (Math.PI / 2));
      const stemPanX = panFinal + orbit * blendedSpatialScatter * 0.6;
      node.panner.positionX.setTargetAtTime(stemPanX, this.ctx!.currentTime, 0.05);
      node.filter.frequency.setTargetAtTime(filterFinal, this.ctx!.currentTime, 0.05);
      node.dryGain.gain.setTargetAtTime(1 - baseWet, this.ctx!.currentTime, 0.05);
      node.wetGain.gain.setTargetAtTime(baseWet, this.ctx!.currentTime, 0.05);
      node.audio.playbackRate = Math.pow(2, detuneCents / 1200);
    });

    // Bregman onset-synchrony: at section boundaries, nudge stem currentTime
    // by ±half the section's onsetOffsetMs. Vocals (i=0) stays anchored as the
    // psychoacoustic reference; other stems alternate sign so they fan out.
    if (idx !== this.lastSectionIdx) {
      this.lastSectionIdx = idx;
      const offsetMs = sec.onsetOffsetMs ?? 0;
      this.stemNodes.forEach((node, i) => {
        if (i === 0 || offsetMs === 0) return; // vocals stays anchored
        const seekDelta = (offsetMs / 1000) * (i % 2 === 0 ? 1 : -1) * 0.5; // ±half the offset
        try { node.audio.currentTime = Math.max(0, node.audio.currentTime + seekDelta); } catch {}
      });
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

    // Per-stem onset detection. When stems are loaded each stem owns its
    // analyser; stem index maps directly to stave (vocals=0, drums=1, bass=2,
    // other=3). No-op when stemNodes is empty (single-source path handled above).
    if (this.stemNodes.length > 0) {
      this.stemNodes.forEach((node, idx) => {
        node.analyser.getByteTimeDomainData(node.timeBuf);
        let sumSq = 0;
        for (let i = 0; i < node.timeBuf.length; i++) {
          const v = (node.timeBuf[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / node.timeBuf.length);
        const delta = rms - node.prevRMS;
        node.prevRMS = rms;
        node.cooldown = Math.max(0, node.cooldown - 1);
        if (node.cooldown === 0 && delta > 0.04 && rms > 0.06) {
          node.cooldown = 8;
          this.opts.onOnset(idx); // 0=vocals, 1=drums, 2=bass, 3=other
        }
      });
    }
  };
}

export function Listening() {
  const setPhase = useStore((s) => s.setPhase);
  const sessionTrackUrl = useStore((s) => s.sessionTrackUrl);
  const sessionStemUrls = useStore((s) => s.sessionStemUrls);
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const songYears = useStore((s) => s.songYears);
  const tapBPM = useStore((s) => s.tapBPM);
  const gentlePath = useStore((s) => s.gentlePath);

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
  // Honor `prefers-reduced-motion`: such users get the softened peak even
  // if they didn't flag a screening item. Phase 9's continuous spatial
  // drift + detune is hostile to vestibular sensitivity.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  const effectiveGentlePath = gentlePath || reducedMotion;

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
  // Revocation defers ~1.1s after stop() so the engine's fade-out doesn't
  // tear down its source while the HTMLAudioElement is still reading from
  // the blob (engine.stop() schedules a 0.4s ramp + 0.6s ctx.close timer).
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      engineRef.current = null;
      const trackUrl = sessionTrackUrl;
      const stems = sessionStemUrls;
      window.setTimeout(() => {
        if (trackUrl && trackUrl.startsWith('blob:')) {
          try { URL.revokeObjectURL(trackUrl); } catch {}
        }
        if (stems) {
          for (const u of [stems.vocals, stems.drums, stems.bass, stems.other]) {
            try { URL.revokeObjectURL(u); } catch {}
          }
        }
      }, 1100);
    };
    // sessionStemUrls intentionally omitted — captured by closure above; we
    // only need to re-arm if the underlying playable URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // CRITICAL: iOS Safari only allows AudioContext.resume() and
    // requestPermission() during a user gesture. Both must happen before
    // any `await`, since the gesture token is consumed across the
    // microtask boundary. Prime the context first (synchronous), kick the
    // permission requests (which don't need to be awaited to start), then
    // hand the warmed context to the engine.
    const ctx = primeAudioContext();
    if (needsIosPerm) {
      const w = window as unknown as {
        DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
        DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
      };
      // Fire both — failures are fine; pointer fallback covers denial.
      // Use `?.catch` so an absent requestPermission (i.e., `?.()` returning
      // undefined) doesn't throw a TypeError before the catch handler attaches.
      w.DeviceOrientationEvent?.requestPermission?.()?.catch(() => null);
      w.DeviceMotionEvent?.requestPermission?.()?.catch(() => null);
    }
    const engine = new ListeningEngine({
      url: playUrl,
      stemUrls: sessionStemUrls,
      gentlePath: effectiveGentlePath,
      ctx,
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

      {/*
       * Admirer relational-withdrawal arc — voice timed to section starts.
       * Caretaking stands in for the unwired "Fading/Return" register; the
       * peak window (150_000–210_000) is deliberately silent so the Admirer
       * dissolves with the listener rather than narrating over the apex.
       */}
      {started && (
        <>
          <AdmirerLine text="you have it. start moving." register="elevated"   delayMs={1500} />
          <AdmirerLine text="let it widen."              register="caretaking" delayMs={62_000} />
          {/* peak: deliberate silence — no AdmirerLine emitted between 150_000 and 210_000 */}
          <AdmirerLine text="you're here."               register="caretaking" delayMs={212_000} />
          <AdmirerLine text="we made this together."     register="elevated"   delayMs={272_000} />
        </>
      )}
    </div>
  );
}
