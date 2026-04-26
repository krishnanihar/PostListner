'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Downbeat, Tactus } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { scoreArchetypes } from '@/lib/scoring';

const LIKING_SCALE = [1, 2, 3, 4, 5, 6, 7] as const;
const STAVE_Y = 290;
const STAVE_WIDTH = VB_W - MARGIN_X * 2;
const TACTUS_Y = 360;

export function Moment() {
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);
  const tapTimes = useStore((s) => s.tapTimes);
  const tapBPM = useStore((s) => s.tapBPM);
  const likingValue = useStore((s) => s.likingValue);
  const pushTap = useStore((s) => s.pushTap);
  const setBPM = useStore((s) => s.setBPM);
  const setLiking = useStore((s) => s.setLiking);
  const setPhase = useStore((s) => s.setPhase);

  const provisional = useMemo(
    () => scoreArchetypes(pairChoices, pairLatencies, emotionTiles)[0],
    [pairChoices, pairLatencies, emotionTiles]
  );

  const sessionStart = useRef(performance.now());
  const [, force] = useState(0);

  // place tap dots evenly across the stave so the rhythm reads
  const tapDots = tapTimes.map((_, i) => {
    const total = Math.max(tapTimes.length, 1);
    const x = MARGIN_X + 16 + (i / Math.max(total - 1, 1)) * (STAVE_WIDTH - 32);
    return { x, y: STAVE_Y + 6 };
  });

  useEffect(() => {
    if (tapTimes.length < 2) return;
    const intervals: number[] = [];
    for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const bpm = Math.round(60000 / median);
    if (bpm > 30 && bpm < 220) setBPM(bpm);
  }, [tapTimes, setBPM]);

  const onTap = () => {
    pushTap(performance.now());
    force((n) => n + 1);
  };

  const hint =
    tapTimes.length === 0
      ? 'tap any rhythm'
      : tapTimes.length < 2
      ? 'again'
      : tapTimes.length < 4
      ? 'keep going'
      : 'good — hold there';

  const onLikingClick = (value: number) => {
    setLiking(value);
    setTimeout(() => setPhase(5), 700);
  };

  const tactusFrequency = tapBPM ? Math.max(2, Math.min(10, tapBPM / 18)) : 4;

  return (
    <Score
      variant="cream"
      pageTitle="v. moment"
      pageNumber="audition"
      voiceCue={
        tapTimes.length >= 4
          ? 'how does this sit with you?'
          : "this one's been waiting for you"
      }
      footer={`auditioning · ${provisional.name.toLowerCase()} · ${provisional.variation.toLowerCase()}`}
      staves={[{ y: STAVE_Y }]}
      overlay={
        <>
          <button
            type="button"
            onClick={onTap}
            aria-label="Tap rhythm"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '70%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '25%',
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontSize: 56,
              color: COLORS.inkCream,
              lineHeight: 1,
              pointerEvents: 'none',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {tapBPM ?? '— —'}
            <div
              style={{
                fontSize: 10,
                color: COLORS.inkCreamSecondary,
                fontFamily: FONTS.mono,
                letterSpacing: '0.18em',
                marginTop: 8,
                fontStyle: 'normal',
              }}
            >
              BPM
            </div>
            <div
              style={{
                fontSize: 12,
                color: COLORS.inkCreamSecondary,
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                marginTop: 12,
              }}
            >
              {hint}
            </div>
          </div>

          <div
            className={`liking-row${tapTimes.length >= 4 ? '' : ''}`}
            style={{
              position: 'absolute',
              bottom: '17%',
              left: 0,
              right: 0,
              opacity: tapTimes.length >= 4 ? 1 : 0,
              pointerEvents: tapTimes.length >= 4 ? 'auto' : 'none',
              transition: 'opacity 0.6s',
            }}
          >
            {LIKING_SCALE.map((n) => (
              <button
                key={n}
                type="button"
                className={`liking-num${likingValue === n ? ' chosen' : ''}`}
                onClick={() => onLikingClick(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '13%',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 22%',
              fontFamily: FONTS.mono,
              fontSize: 8.5,
              letterSpacing: '0.18em',
              color: COLORS.inkCreamSecondary,
              opacity: tapTimes.length >= 4 ? 0.8 : 0,
              transition: 'opacity 0.6s',
            }}
          >
            <span>not for me</span>
            <span>yes — this</span>
          </div>
        </>
      }
    >
      {tapDots.map((d, i) => (
        <g key={i} transform={`translate(${d.x}, ${d.y})`}>
          <Downbeat size={4} color={COLORS.inkCream} opacity={0.85} />
        </g>
      ))}
      {tapBPM && (
        <g transform={`translate(${MARGIN_X}, ${TACTUS_Y})`}>
          <Tactus
            width={STAVE_WIDTH}
            color={COLORS.inkCreamSecondary}
            amplitude={4}
            frequency={tactusFrequency}
            opacity={0.5}
          />
        </g>
      )}
    </Score>
  );
}
