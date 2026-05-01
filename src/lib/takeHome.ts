/**
 * Take-home payload — a single text file the listener can save.
 * Per Research/ego-dissolution-postlistener-architecture §Post-audio integration:
 * a transitional object in Winnicott's sense — something to carry from the
 * experience into ordinary life.
 *
 * Plain text intentionally — no JSON, no QR, no link. The artifact is the words.
 */

export interface TakeHomeOpts {
  userName: string;
  archetype: string;
  variation: string;
  title: string | null;
}

export function buildTakeHome(opts: TakeHomeOpts): string {
  const { userName, archetype, variation, title } = opts;
  const composedAt = new Date().toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const lines = [
    `for ${userName || 'you'}`,
    '',
    `your name for this hour: ${archetype}`,
    `your variation: ${variation}`,
    title ? `your piece: ${title}` : '',
    '',
    `composed at ${composedAt}`,
    '',
    'this experience was a designed encounter with the threshold of dissolution.',
    'whatever you felt is a normal response to this kind of audio.',
    '',
    'kept here. nowhere else.',
  ].filter(Boolean);
  return lines.join('\n');
}
