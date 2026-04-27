/**
 * Runtime feature flags. Read once at module load.
 *
 * Offline mode: when `NEXT_PUBLIC_POSTLISTENER_OFFLINE=1`, all live
 * ElevenLabs API calls are blocked. Pre-generated static audio still
 * plays; cached voice lines still play; the Web Audio drone still plays.
 * The only thing that goes silent is uncached TTS / un-generated music.
 *
 * Both `process.env.NEXT_PUBLIC_*` (server) and inlined access (client)
 * use the same env var. Next.js inlines NEXT_PUBLIC_ vars at build time.
 */

export function isOfflineMode(): boolean {
  return process.env.NEXT_PUBLIC_POSTLISTENER_OFFLINE === '1';
}
