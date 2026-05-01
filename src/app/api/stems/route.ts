import { NextRequest } from 'next/server';
import { isOfflineMode } from '@/lib/env';

/**
 * POST /api/stems
 *
 * Body: raw audio bytes (audio/mpeg).
 * Returns: application/zip — { vocals.wav, drums.wav, bass.wav, other.wav }.
 *
 * Proxies to the demucs sidecar (configurable via `DEMUCS_URL`, default
 * http://localhost:8001). htdemucs is slow on CPU, hence the 6-minute
 * `maxDuration`. Offline mode short-circuits to a 503.
 */

export const runtime = 'nodejs';
export const maxDuration = 360; // 6 minutes — htdemucs is slow on CPU.

const DEMUCS_URL = process.env.DEMUCS_URL ?? 'http://localhost:8001';

export async function POST(req: NextRequest) {
  if (isOfflineMode()) {
    return new Response('offline', { status: 503 });
  }
  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0) return new Response('empty body', { status: 400 });

  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'audio/mpeg' }), 'input.mp3');

  const upstream = await fetch(`${DEMUCS_URL}/separate`, { method: 'POST', body: form });
  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(`demucs error: ${text}`, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'application/zip' },
  });
}
