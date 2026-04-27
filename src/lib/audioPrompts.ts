import type { Pair, PairOption, Archetype, Variation } from '@/types';

/**
 * Maps Phase 1 pair-side metadata → an ElevenLabs Music prompt for the
 * 8s sonic-contrast clip. The clip should be unmistakable on its axis;
 * unfamiliar and short per Eerola & Vuoskoski 2011 / Nave et al. 2018.
 */
export function pairClipPrompt(axis: Pair['axis'], side: PairOption): string {
  const label = side.label;
  // Per-label musical descriptions — direct and sonically defensible.
  const map: Record<string, string> = {
    WARM:        'Solo felt piano on warm analog tape, slow 60 BPM, mellow contemplative atmosphere, vinyl crackle, instrumental.',
    COLD:        'Sparse digital glassy synthesizer, crystalline timbre, cold and distant, slow tempo, 60 BPM, instrumental.',
    DENSE:       'Layered chamber strings and woodwinds, lush dense arrangement, mid-tempo 90 BPM, full and busy, instrumental.',
    SPARE:       'Solo cello, very sparse single notes, intimate close-miked, slow 60 BPM, lots of silence, instrumental.',
    SUNG:        'Solo wordless human humming melody, gentle female voice, intimate close vocal, mid-tempo 80 BPM.',
    WORDLESS:    'Ambient drone with sustained synthesizer tones, no vocals, atmospheric, slow 50 BPM, instrumental.',
    ANALOG:      'Vintage tape recording with light hiss, hands-on acoustic instruments, organic warm production, 80 BPM, instrumental.',
    DIGITAL:     'Crystalline synthesized electronic textures, clean digital production, modern shimmering sound, 80 BPM, instrumental.',
    MAJOR:       'Bright major-key acoustic guitar arpeggios, light and walking, hopeful warm mood, 90 BPM, instrumental.',
    MINOR:       'Minor-key felt piano, melancholic and unresolved, slow 70 BPM, instrumental.',
    SLOW:        'Very slow ambient piano, 50 BPM, time stretched, contemplative spacious, instrumental.',
    MID:         'Mid-tempo 100 BPM steady electric piano with light brushes, easy flowing pulse, instrumental.',
    DRIVING:     'Driving 120 BPM forward-motion rhythm, urgent percussive bass and drums, instrumental.',
    FLOATING:    'Floating ambient synth pad, no clear pulse, drifting and weightless, slow 50 BPM, instrumental.',
    LOW:         'Deep sub-bass-heavy texture, low-register cello and contrabass, chest-resonant, 70 BPM, instrumental.',
    HIGH:        'High-register glockenspiel and bells, bright treble-dominant shimmer, light 80 BPM, instrumental.',
    REVERBERANT: 'Cathedral reverb-soaked piano, washy wet ambient, the room is the instrument, slow 60 BPM, instrumental.',
    DRY:         'Dry close-miked acoustic guitar, no reverb, intimate and present, 80 BPM, instrumental.',
  };
  const description = map[label] ?? `${axis} ${label.toLowerCase()}, instrumental, 80 BPM.`;
  return description + ` Brief 8-second excerpt suggesting ${label.toLowerCase()}.`;
}

/** Stable filename key for a pair-side clip. */
export function pairClipKey(axis: Pair['axis'], side: 'a' | 'b'): string {
  return `${axis}_${side}`;
}

/**
 * Maps Phase 2 GEMS excerpt category → 15s prompt for the audio probe.
 * Categories aligned to GEMS-9 / Cowen-13 superordinate clusters.
 */
export const GEMS_PROMPTS: { key: string; name: string; prompt: string }[] = [
  {
    key: 'sublimity',
    name: 'EXCERPT I · SUBLIMITY',
    prompt:
      'Cinematic orchestral swell, strings rising slowly, full string section building toward awe and transcendence, ' +
      'sense of vastness and wonder, like looking at a mountain. Major key. 70 BPM. Instrumental. 15 seconds.',
  },
  {
    key: 'longing',
    name: 'EXCERPT II · LONGING',
    prompt:
      'Solo felt piano with subtle string accompaniment, melancholic but warm, evokes nostalgia and tenderness, ' +
      'unresolved harmony, intimate close-miked, 70 BPM, minor key, instrumental. 15 seconds.',
  },
  {
    key: 'power',
    name: 'EXCERPT III · POWER',
    prompt:
      'Driving post-rock build, distorted electric guitar swells, urgent percussion crescendoing, increasing tension, ' +
      'minor key, 100 BPM, instrumental. 15 seconds.',
  },
];

/**
 * Builds an ElevenLabs Music prompt for an audition clip — one per
 * archetype × variation. Used in Phase 4 (Moment) to play under the
 * tap-along + liking probe.
 *
 * NOTE: archetype names are intentionally dropped. ElevenLabs' content
 * moderator flagged some archetype-name prompts (e.g. "Velvet Mystic").
 * The musical descriptors are sufficient to drive the generation; the
 * archetype name is presentation-only.
 */
export function auditionPrompt(archetype: Archetype, variation: Variation): string {
  // BPM hint from variation arousal (memo §4: bpm = 55 + 110 * arousal).
  const bpm = Math.round(55 + 110 * variation.avd[0]);
  // Mode from valence: minor under 0.45, major over 0.6, modal between.
  const mode =
    variation.avd[1] < 0.45 ? 'minor key' : variation.avd[1] > 0.6 ? 'major key' : 'modal';
  const warmth = variation.production.warmth > 0.65 ? 'warm analog' : 'clean digital';
  const density =
    variation.production.density > 0.6
      ? 'layered arrangement'
      : variation.production.density < 0.4
      ? 'sparse arrangement'
      : 'moderate density';
  // Strip archetype-name prefixes and the "The" article from the tag.
  const safeTag = variation.tag.replace(/[·]/g, ',');
  return (
    `${safeTag}. Mood: ${variation.emotions.join(', ')}. ` +
    `${bpm} BPM, ${mode}, ${warmth} production, ${density}. ` +
    `Instrumental excerpt, 30 seconds.`
  );
}

/** Stable filename key for an audition clip. */
export function auditionKey(variation: Variation): string {
  return variation.id;
}
