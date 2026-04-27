/**
 * Admirer voice — three registers per voice-intimacy-admirer-design.md.
 *
 * - Caretaking: warm, intimate, slow. Phase 0, Phase 3, Phase 5.
 * - Present:    direct second-person, alert. Phase 4 audition, Phase 8 reveal.
 * - Elevated:   theatrical, oracular. Phase 2 mid-set, Phase 6 Forer reveal.
 *
 * voice_settings per register are tuned to match. Stability lower = more
 * expressive variation; style higher = more theatrical; speed < 1 = slower.
 */

export type AdmirerRegister = 'caretaking' | 'present' | 'elevated';

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
}

export const REGISTER_SETTINGS: Record<AdmirerRegister, VoiceSettings> = {
  caretaking: {
    stability: 0.50,
    similarity_boost: 0.78,
    style: 0.40,
    speed: 0.92,
    use_speaker_boost: true,
  },
  present: {
    stability: 0.45,
    similarity_boost: 0.75,
    style: 0.55,
    speed: 1.00,
    use_speaker_boost: true,
  },
  elevated: {
    stability: 0.40,
    similarity_boost: 0.72,
    style: 0.72,
    speed: 0.95,
    use_speaker_boost: true,
  },
};

/** Default voice ID — Rachel (warm, intimate female). Override with env. */
export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export const ELEVENLABS_TTS_MODEL = 'eleven_v3';

/** Stable hash for a (text, register) pair — used for client cache + filenames. */
export function admirerCacheKey(text: string, register: AdmirerRegister): string {
  let h = 0;
  const s = `${register}::${text}`;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
