'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Fermata, Marcato, Tremolo, Linea } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import {
  computeAVD,
  scoreArchetypes,
  pickVariation,
  getTimeOfDayLine,
  getLatencyLine,
} from '@/lib/scoring';
import { buildAttribution, pickMirrorSong } from '@/lib/reflection';
import { AdmirerLine } from '@/components/AdmirerLine';

/**
 * Render a Forer line, replacing any `___` marker with a typographically
 * distinct blank — a faded amber underscore the listener's eye reads as an
 * invitation to fill, not as missing copy. DARKFIELD's "audience-sized
 * holes" principle (Glen Neath, The Lowry 2024).
 *
 * Lines without `___` are returned as-is. Multiple markers are not
 * supported (none of the archetypes ship with more than one).
 */
function renderForer(line: string): ReactNode {
  const idx = line.indexOf('___');
  if (idx < 0) return line;
  const before = line.slice(0, idx);
  const after = line.slice(idx + 3);
  return (
    <>
      {before}
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: '5.5ch',
          borderBottom: `0.5px solid ${COLORS.scoreAmber}`,
          opacity: 0.55,
          marginBottom: 4,
          verticalAlign: 'baseline',
        }}
      />
      {/* Screen-reader fallback so the gap is announced as a pause, not skipped. */}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {' '}— a blank for you —{' '}
      </span>
      {after}
    </>
  );
}

export function Mirror() {
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const songs = useStore((s) => s.songs);
  const songYears = useStore((s) => s.songYears);
  const tapBPM = useStore((s) => s.tapBPM);
  const userName = useStore((s) => s.userName);
  const setPhase = useStore((s) => s.setPhase);

  const top = useMemo(
    () => scoreArchetypes(pairChoices, pairLatencies, emotionTiles)[0],
    [pairChoices, pairLatencies, emotionTiles]
  );
  const variation = useMemo(() => {
    const { vector } = computeAVD(pairChoices, pairLatencies);
    return pickVariation(top, {
      avd: vector,
      songYears: songYears.filter((y): y is number => !!y),
      tapBPM,
      emotionTiles: emotionTiles.flat(),
    });
  }, [top, pairChoices, pairLatencies, songYears, tapBPM, emotionTiles]);
  const timeLine = useMemo(() => getTimeOfDayLine(), []);
  const latencyLine = useMemo(() => getLatencyLine(pairLatencies), [pairLatencies]);
  const attribution = useMemo(
    () =>
      buildAttribution({
        pairChoices,
        pairLatencies,
        emotionTiles,
        songs,
        songYears,
        tapBPM,
      }),
    [pairChoices, pairLatencies, emotionTiles, songs, songYears, tapBPM]
  );
  const mirrorSong = useMemo(() => pickMirrorSong(songs, songYears), [songs, songYears]);

  const [stage, setStage] = useState(0);

  // Stage timings re-paced so the voiced beats have ~3s of room each.
  // Voice plays Caretaking on the archetype name and closing; Elevated on
  // the Forer paragraphs.
  const STAGE_T = useMemo(
    () => ({
      name: 500,           // stage 1
      variation: 2000,     // stage 2 (variation + divider + attribution)
      forer1: 4200,        // stage 3
      forer2: 7200,        // stage 4
      forer3: 10200,       // stage 5
      forer4: 13200,       // stage 6 (+ latency text)
      forer5: 16200,       // stage 7 (+ time-of-day text)
      memory: 19200,       // stage 8
      handoff: 22500,      // stage 9
      next: 27000,
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const guard = (n: number) => () => { if (!cancelled) setStage(n); };
    const timers = [
      setTimeout(guard(1), STAGE_T.name),
      setTimeout(guard(2), STAGE_T.variation),
      setTimeout(guard(3), STAGE_T.forer1),
      setTimeout(guard(4), STAGE_T.forer2),
      setTimeout(guard(5), STAGE_T.forer3),
      setTimeout(guard(6), STAGE_T.forer4),
      setTimeout(guard(7), STAGE_T.forer5),
      setTimeout(guard(8), STAGE_T.memory),
      setTimeout(guard(9), STAGE_T.handoff),
      setTimeout(() => { if (!cancelled) setPhase(7); }, STAGE_T.next),
    ];
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [setPhase, STAGE_T]);

  return (
    <Score
      variant="dark"
      pageTitle="vii. mirror"
      pageNumber="—"
      footer="a name for this hour"
      overlay={
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingTop: '10%',
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 9,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: COLORS.scoreAmber,
              textAlign: 'center',
              opacity: stage >= 1 ? 1 : 0,
              transition: 'opacity 1.4s ease-out',
              marginBottom: 18,
            }}
          >
            — a name for this hour —
          </div>
          <h1
            style={{
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(46px, 11vw, 76px)',
              lineHeight: 0.98,
              color: COLORS.inkDark,
              textAlign: 'center',
              margin: '6px 0 14px',
              opacity: stage >= 1 ? 1 : 0,
              transform: stage >= 1 ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 1.6s ease-out, transform 1.6s ease-out',
              letterSpacing: '-0.015em',
            }}
          >
            {top.name}
          </h1>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 11,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: COLORS.inkDarkSecondary,
              textAlign: 'center',
              opacity: stage >= 2 ? 1 : 0,
              transition: 'opacity 1.4s ease-out',
              marginBottom: 14,
            }}
          >
            {variation.tag}
          </div>
          <div
            aria-hidden
            style={{
              width: 48,
              height: 1,
              background: COLORS.scoreAmber,
              margin: '0 auto 18px',
              opacity: stage >= 2 ? 0.85 : 0,
              transition: 'opacity 1.4s ease-out',
            }}
          />

          {/* Causal attribution band — Pandora "Why this song" + Netflix
              "because you watched" idiom. Bridges input → archetype before
              identity-language lands. */}
          {attribution && (
            <div
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 12,
                lineHeight: 1.55,
                color: COLORS.inkDarkSecondary,
                textAlign: 'center',
                margin: '0 auto 28px',
                maxWidth: 320,
                opacity: stage >= 2 ? 0.78 : 0,
                transform: stage >= 2 ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 1.6s 0.6s ease-out, transform 1.6s 0.6s ease-out',
              }}
            >
              {attribution}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {top.forer.map((line, i) => {
              const visible = stage >= 3 + i;
              return (
                <p
                  key={i}
                  style={{
                    fontFamily: FONTS.serif,
                    fontStyle: 'italic',
                    fontSize: 17,
                    lineHeight: 1.55,
                    color: i === 3 ? COLORS.inkDarkSecondary : COLORS.inkDark,
                    marginBottom: 14,
                    opacity: visible ? 0.94 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
                  }}
                >
                  {renderForer(line)}
                </p>
              );
            })}
            {latencyLine && (
              <p
                style={{
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: COLORS.inkDarkSecondary,
                  marginTop: 18,
                  opacity: stage >= 6 ? 1 : 0,
                  transform: stage >= 6 ? 'translateY(0)' : 'translateY(6px)',
                  transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
                }}
              >
                {latencyLine}
              </p>
            )}
            <p
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 16,
                color: COLORS.scoreAmber,
                marginTop: latencyLine ? 10 : 18,
                opacity: stage >= 7 ? 1 : 0,
                transform: stage >= 7 ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
              }}
            >
              {timeLine}
            </p>
            {/* Memory callback — Replika pattern. Cites a Phase 3 song the
                Reflection phase did not, so the two beats hit different
                identity registers (Rathbone formative vs taste-autonomy). */}
            {mirrorSong && (
              <p
                style={{
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: COLORS.inkDark,
                  marginTop: 18,
                  opacity: stage >= 8 ? 1 : 0,
                  transform: stage >= 8 ? 'translateY(0)' : 'translateY(6px)',
                  transition: 'opacity 1.4s ease-out, transform 1.4s ease-out',
                }}
              >
                When you said {mirrorSong.song}
                {mirrorSong.year ? ` from ${mirrorSong.year}` : ''}, I knew.
              </p>
            )}
            <p
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 19,
                color: COLORS.scoreAmber,
                marginTop: 32,
                marginBottom: 24,
                textAlign: 'center',
                opacity: stage >= 9 ? 1 : 0,
                transform: stage >= 9 ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 1.6s ease-out, transform 1.6s ease-out',
              }}
            >
              {userName ? `${userName}, I have something for you.` : 'I have something for you.'}
            </p>
          </div>

          {/* Voice — the Mirror reveal's 60-second Forer monologue per
              voice-intimacy memo. Each line is fetched on mount; delayMs
              schedules playback to match the visual stage timer. */}
          <AdmirerLine
            text={top.name + '. ' + variation.tag.replace(/[·]/g, ' — ').toLowerCase() + '.'}
            register="elevated"
            delayMs={STAGE_T.name + 100}
          />
          {top.forer.slice(0, 5).map((line, i) => {
            const stageDelay = [
              STAGE_T.forer1,
              STAGE_T.forer2,
              STAGE_T.forer3,
              STAGE_T.forer4,
              STAGE_T.forer5,
            ][i];
            return (
              <AdmirerLine
                key={`forer-${i}`}
                text={line}
                register="elevated"
                delayMs={stageDelay}
              />
            );
          })}
          {mirrorSong && (
            <AdmirerLine
              text={`when you said ${mirrorSong.song}${mirrorSong.year ? ` from ${mirrorSong.year}` : ''}, I knew.`}
              register="elevated"
              delayMs={STAGE_T.memory}
            />
          )}
          <AdmirerLine
            text={
              userName
                ? `${userName}, I have something for you.`
                : 'I have something for you.'
            }
            register="caretaking"
            delayMs={STAGE_T.handoff}
          />
        </div>
      }
    >
      {/* Phase 1 pair-commit residue — legitimacy laundering per memo §1E.
          Each commit becomes a faint Linea on a quoted spectrum-stave below
          the Forer text. Fades in with the variation tag (stage 2). */}
      {(() => {
        const TRACE_Y = 535;
        const TRACE_LEFT = MARGIN_X + 30;
        const TRACE_RIGHT = VB_W - MARGIN_X - 30;
        const TRACE_W = TRACE_RIGHT - TRACE_LEFT;
        const STEP = TRACE_W / Math.max(pairChoices.length - 1, 1);
        return (
          <g style={{ opacity: stage >= 2 ? 0.32 : 0, transition: 'opacity 2.2s ease-out' }}>
            <line
              x1={TRACE_LEFT}
              y1={TRACE_Y}
              x2={TRACE_RIGHT}
              y2={TRACE_Y}
              stroke={COLORS.inkDarkSecondary}
              strokeWidth="0.4"
              opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            {pairChoices.map((side, i) => {
              if (!side) return null;
              const x = TRACE_LEFT + i * STEP;
              return (
                <g key={i} transform={`translate(${x}, ${TRACE_Y})`}>
                  <Linea
                    size={STEP * 0.85}
                    dip={side === 'a' ? 'left' : 'right'}
                    color={COLORS.inkDark}
                    opacity={0.85}
                  />
                </g>
              );
            })}
          </g>
        );
      })()}

      {/* Decorative marks framing the page — fade in with title */}
      <g
        transform={`translate(${VB_W / 2}, 70)`}
        style={{ opacity: stage >= 1 ? 0.7 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Marcato size={14} color={COLORS.scoreAmber} />
      </g>
      <g
        transform={`translate(${MARGIN_X + 30}, 130)`}
        style={{ opacity: stage >= 2 ? 0.5 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Tremolo size={14} color={COLORS.inkDarkSecondary} />
      </g>
      <g
        transform={`translate(${VB_W - MARGIN_X - 30}, 130)`}
        style={{ opacity: stage >= 2 ? 0.5 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Tremolo size={14} color={COLORS.inkDarkSecondary} />
      </g>
      <g
        transform={`translate(${VB_W / 2}, 580)`}
        style={{ opacity: stage >= 9 ? 0.85 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Fermata size={20} color={COLORS.scoreAmber} />
      </g>
      <g
        transform={`translate(${MARGIN_X}, 600)`}
        style={{ opacity: stage >= 9 ? 0.4 : 0, transition: 'opacity 1.6s ease-out' }}
      >
        <Linea size={VB_W - MARGIN_X * 2} dip="left" color={COLORS.inkDarkSecondary} />
      </g>
    </Score>
  );
}
