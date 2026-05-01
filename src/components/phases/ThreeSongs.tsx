'use client';

import { useEffect, useRef, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Vox } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { SONG_PROMPTS } from '@/data/songs';
import { useStore } from '@/lib/store';
import { eraNarration } from '@/lib/reflection';
import { searchSongs, formatSuggestion, type SongSuggestion } from '@/lib/songSearch';
import { AdmirerLine } from '@/components/AdmirerLine';

const STAVE_Y = 360;
const SEARCH_DEBOUNCE_MS = 280;
const RECEIVED_HOLD_MS = 1700;

/**
 * Per-prompt context line for the "received" beat — pulls a thread from
 * the original Rathbone framing so the year reads as identity, not data.
 */
const PROMPT_CONTEXT = [
  'when you were forming.',          // songs[0] — formative period
  'tied to one specific person.',    // songs[1] — relational binding
  'the first one that was yours.',   // songs[2] — taste autonomy
] as const;

export function ThreeSongs() {
  const songIndex = useStore((s) => s.songIndex);
  const songs = useStore((s) => s.songs);
  const songYears = useStore((s) => s.songYears);
  const setSong = useStore((s) => s.setSong);
  const nextSong = useStore((s) => s.nextSong);

  const inputRef = useRef<HTMLInputElement>(null);
  const prompt = SONG_PROMPTS[songIndex];

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [received, setReceived] = useState<{ year: number | null; title: string } | null>(null);

  // Inline reminiscence-bump callback — Krumhansl & Zupnick 2013, replicated
  // 2025 across 84 countries. Surfaces only on the third song's received
  // beat, when at least two valid release years have been captured.
  const inlineEraLine = (() => {
    if (songIndex !== 2 || !received) return null;
    const validYears = songYears.filter((y): y is number => Number.isFinite(y as number));
    if (validYears.length < 2) return null;
    return eraNarration(validYears);
  })();

  // Reset draft + suggestions on each prompt
  useEffect(() => {
    setQuery('');
    setSuggestions([]);
    setLoading(false);
    setReceived(null);
    inputRef.current?.focus();
  }, [songIndex]);

  // Debounced iTunes Search lookup. Aborts in-flight requests on each
  // keystroke so only the most recent query lands.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = window.setTimeout(async () => {
      const results = await searchSongs(q);
      if (cancelled) return;
      setSuggestions(results);
      setLoading(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  const advanceWithReceivedBeat = (title: string, year: number | null) => {
    setReceived({ title, year });
    window.setTimeout(() => nextSong(), RECEIVED_HOLD_MS);
  };

  const commitSuggestion = (s: SongSuggestion) => {
    setSong(songIndex, formatSuggestion(s), s.year);
    advanceWithReceivedBeat(s.trackName, s.year);
  };

  const commitFreeText = () => {
    const value = query.trim();
    if (!value) return;
    setSong(songIndex, value, null);
    advanceWithReceivedBeat(value, null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !received) {
      e.preventDefault();
      if (suggestions.length > 0) commitSuggestion(suggestions[0]);
      else commitFreeText();
    }
  };

  // a Vox mark for each song already entered
  const voxMarks = songs.slice(0, songIndex).map((_, i) => i);

  return (
    <Score
      variant="cream"
      pageTitle="iv. carry"
      pageNumber={`${songIndex + 1} / 3`}
      voiceCue="take your time. the wrong one would feel wrong."
      staves={[{ y: STAVE_Y - 20, opacity: 0.3 }]}
      overlay={
        <>
          <div
            style={{
              position: 'absolute',
              top: '14%',
              left: 28,
              right: 28,
              textAlign: 'center',
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontSize: 22,
              lineHeight: 1.4,
              color: COLORS.inkCream,
              letterSpacing: '-0.005em',
            }}
          >
            {prompt.line.toLowerCase()}
          </div>

          <div
            style={{
              position: 'absolute',
              top: '36%',
              left: 28,
              right: 28,
              borderBottom: `1px solid ${COLORS.inkCream}`,
              paddingBottom: 6,
            }}
          >
            <input
              key={songIndex}
              ref={inputRef}
              className="score-input"
              placeholder="a song, an artist…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              onKeyDown={onKeyDown}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: '43%',
              left: 28,
              right: 28,
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: 9,
              letterSpacing: '0.18em',
              color: COLORS.inkCreamSecondary,
            }}
          >
            {prompt.meta}
          </div>

          {/* Suggestion list — fades in once results arrive. */}
          <div
            style={{
              position: 'absolute',
              top: '49%',
              left: 28,
              right: 28,
              bottom: '20%',
              overflowY: 'auto',
              opacity: suggestions.length > 0 ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              pointerEvents: suggestions.length > 0 ? 'auto' : 'none',
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => commitSuggestion(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `0.5px solid ${COLORS.inkCreamSecondary}`,
                  padding: '8px 4px',
                  cursor: 'pointer',
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: COLORS.inkCream,
                  lineHeight: 1.35,
                }}
              >
                <div style={{ opacity: 0.95 }}>{s.trackName.toLowerCase()}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.inkCreamSecondary,
                    marginTop: 2,
                    fontStyle: 'normal',
                    fontFamily: FONTS.mono,
                    letterSpacing: '0.06em',
                  }}
                >
                  {s.artistName.toLowerCase()}
                  {s.year ? `  ·  ${s.year}` : ''}
                </div>
              </button>
            ))}
          </div>

          {/* Inline status indicator */}
          {loading && suggestions.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                textAlign: 'center',
                fontFamily: FONTS.mono,
                fontSize: 9,
                letterSpacing: '0.16em',
                color: COLORS.inkCreamSecondary,
                opacity: 0.6,
              }}
            >
              listening…
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              bottom: '12%',
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: 9,
              letterSpacing: '0.16em',
              color: COLORS.inkCreamSecondary,
            }}
          >
            {suggestions.length > 0 ? 'tap one — or press enter for the top' : 'press enter to keep what you typed'}
          </div>

          {/* Voice intro — only on the first prompt, Caretaking register. */}
          {songIndex === 0 && !received && (
            <AdmirerLine
              text="take your time. the wrong one would feel wrong."
              register="caretaking"
              delayMs={800}
            />
          )}

          {/* "Received" beat — Krumhansl & Zupnick reminiscence-bump moment.
              When the user commits a song, we hold for ~1.7s on the year +
              a per-prompt identity context line. It's the system saying
              "I heard you" before advancing. */}
          {received && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(242, 235, 216, 0.94)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                animation: 'sceneFade 0.5s ease-out',
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: COLORS.inkCreamSecondary,
                  letterSpacing: '0.02em',
                  maxWidth: 280,
                  textAlign: 'center',
                }}
              >
                {received.title}
              </div>
              {received.year != null && (
                <div
                  style={{
                    fontFamily: FONTS.serif,
                    fontStyle: 'italic',
                    fontSize: 64,
                    color: COLORS.inkCream,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                  }}
                >
                  {received.year}
                </div>
              )}
              <div
                style={{
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: COLORS.scoreAmber,
                  textAlign: 'center',
                  maxWidth: 260,
                  marginTop: 6,
                }}
              >
                {PROMPT_CONTEXT[songIndex] ?? ''}
              </div>
              {inlineEraLine && (
                <div
                  style={{
                    fontFamily: FONTS.serif,
                    fontStyle: 'italic',
                    fontSize: 13,
                    color: COLORS.inkCreamSecondary,
                    textAlign: 'center',
                    maxWidth: 280,
                    marginTop: 14,
                    opacity: 0,
                    animation: 'sceneFade 1.2s 0.6s ease-out forwards',
                  }}
                >
                  {inlineEraLine}
                </div>
              )}
            </div>
          )}
        </>
      }
    >
      {voxMarks.map((i) => {
        const x = MARGIN_X + 20 + i * 28;
        return (
          <g key={i} transform={`translate(${x}, ${STAVE_Y - 26})`}>
            <Vox size={10} color={COLORS.inkCream} opacity={0.7} />
          </g>
        );
      })}
    </Score>
  );
}
