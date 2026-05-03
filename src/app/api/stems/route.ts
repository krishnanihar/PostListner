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

// Sidecar deactivated: Phase 9 uses the single-source fallback in Listening.
// Flip to true and run the services/demucs container to re-enable.
const STEMS_ENABLED = false;

const DEMUCS_URL = process.env.DEMUCS_URL ?? 'http://localhost:8001';
// Mirror the demucs sidecar's MAX_UPLOAD_BYTES so the Next.js layer fails
// fast instead of buffering a 1GB upload into memory and then having the
// sidecar reject it.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!STEMS_ENABLED) {
    return new Response('stems disabled', { status: 503 });
  }
  if (isOfflineMode()) {
    return new Response('offline', { status: 503 });
  }
  // Cheap pre-check via Content-Length when the client provided one.
  const declaredLen = Number(req.headers.get('content-length') ?? 0);
  if (declaredLen > MAX_UPLOAD_BYTES) {
    return new Response('payload too large', { status: 413 });
  }
  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0) return new Response('empty body', { status: 400 });
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    return new Response('payload too large', { status: 413 });
  }

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
