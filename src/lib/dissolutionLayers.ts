/**
 * Sub-bass drone + theta binaural beats for the dissolution arc.
 * Per Research/ego-dissolution-postlistener-architecture:
 *   - Sub-bass at 50–70 Hz functions as orientation point during peak.
 *   - Binaural beats at 5–6 Hz (theta) embedded in carrier ~350 Hz.
 *   - Both ramp in over `release`, peak at `peak`, ramp out by `homecoming`.
 *
 * Headphones-only — binaural beats require dichotic delivery. Mono speakers
 * collapse to a single carrier tone with no perceptual beat.
 */

export interface DissolutionLayerOpts {
  /** Section name from ListeningEngine SECTIONS. */
  section: 'threshold' | 'release' | 'peak' | 'return' | 'homecoming' | 'silence';
}

const SECTION_GAINS: Record<DissolutionLayerOpts['section'], { drone: number; binaural: number; water: number }> = {
  threshold:  { drone: 0.00, binaural: 0.00, water: 0.00 },
  release:    { drone: 0.05, binaural: 0.04, water: 0.10 },
  peak:       { drone: 0.12, binaural: 0.07, water: 0.18 },
  return:     { drone: 0.06, binaural: 0.04, water: 0.12 },
  homecoming: { drone: 0.02, binaural: 0.00, water: 0.05 },
  silence:    { drone: 0.00, binaural: 0.00, water: 0.00 },
};

export class DissolutionLayers {
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private binauralLeftOsc: OscillatorNode | null = null;
  private binauralRightOsc: OscillatorNode | null = null;
  private binauralLeftGain: GainNode | null = null;
  private binauralRightGain: GainNode | null = null;
  private binauralMerger: ChannelMergerNode | null = null;
  private masterGain: GainNode | null = null;
  private water: HTMLAudioElement | null = null;
  private waterGain: GainNode | null = null;

  constructor(private ctx: AudioContext, output: AudioNode) {
    // Drone: 60 Hz sine into a gain into the output. No HRTF — the sub-bass
    // should be diffuse / non-localized, not part of the spatialized signal.
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 60;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneOsc.connect(droneGain);

    // Binaural: split carrier into L (~350 Hz) and R (~355 Hz) → ~5 Hz beat.
    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    rightOsc.type = 'sine';
    leftOsc.frequency.value = 350;
    rightOsc.frequency.value = 355;
    const leftGain = ctx.createGain();
    const rightGain = ctx.createGain();
    leftGain.gain.value = 0;
    rightGain.gain.value = 0;
    leftOsc.connect(leftGain);
    rightOsc.connect(rightGain);
    const merger = ctx.createChannelMerger(2);
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);

    // Master gain so the React side can fade everything down on stop().
    const master = ctx.createGain();
    master.gain.value = 1;
    droneGain.connect(master);
    merger.connect(master);
    master.connect(output);

    droneOsc.start();
    leftOsc.start();
    rightOsc.start();

    // Water field-recording: looping HTMLAudioElement routed through a gain
    // into the same master so it ducks together with drone + binaural on stop.
    // Asset is sourced out-of-band; if missing, .play() rejects silently and
    // this layer is a no-op.
    this.water = new Audio('/audio/ambient/water_loop.mp3');
    this.water.loop = true;
    this.water.crossOrigin = 'anonymous';
    const waterSource = ctx.createMediaElementSource(this.water);
    const waterGain = ctx.createGain();
    waterGain.gain.value = 0;
    waterSource.connect(waterGain);
    waterGain.connect(master);
    this.waterGain = waterGain;
    this.water.play().catch(() => {}); // no-op if asset missing

    this.droneOsc = droneOsc;
    this.droneGain = droneGain;
    this.binauralLeftOsc = leftOsc;
    this.binauralRightOsc = rightOsc;
    this.binauralLeftGain = leftGain;
    this.binauralRightGain = rightGain;
    this.binauralMerger = merger;
    this.masterGain = master;
  }

  /** Called from the engine tick with the current blended-section name. */
  setSection(section: DissolutionLayerOpts['section']) {
    if (!this.ctx || !this.droneGain || !this.binauralLeftGain || !this.binauralRightGain) return;
    const targets = SECTION_GAINS[section];
    const t = this.ctx.currentTime;
    const SMOOTH = 1.5; // long ramp — these layers should never pop in.
    this.droneGain.gain.setTargetAtTime(targets.drone, t, SMOOTH);
    this.binauralLeftGain.gain.setTargetAtTime(targets.binaural, t, SMOOTH);
    this.binauralRightGain.gain.setTargetAtTime(targets.binaural, t, SMOOTH);
    this.waterGain?.gain.setTargetAtTime(targets.water, t, SMOOTH);
  }

  stop() {
    try {
      if (this.masterGain) {
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
        this.masterGain.gain.linearRampToValueAtTime(0, t + 0.4);
      }
    } catch {}
    window.setTimeout(() => {
      try { this.droneOsc?.stop(); } catch {}
      try { this.binauralLeftOsc?.stop(); } catch {}
      try { this.binauralRightOsc?.stop(); } catch {}
      try { this.water?.pause(); } catch {}
    }, 600);
  }
}
