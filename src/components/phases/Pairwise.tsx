'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Linea } from '@/score/marks';
import { PairWaveform } from '@/score/PairWaveform';
import { PairAudio } from '@/components/PairAudio';
import { COLORS, FONTS } from '@/score/tokens';
import { PAIRS } from '@/data/pairs';
import { useStore } from '@/lib/store';
import { computeMidsetComment } from '@/lib/reflection';
import type { Side, WaveShape } from '@/types';

const STAVE_Y = 320;
const STAVE_WIDTH = VB_W - MARGIN_X * 2;
const MARK_SPACING = STAVE_WIDTH / PAIRS.length;
/** Acknowledgement window after a commit before advancing. */
const ACK_MS = 600;

const AXIS_LABEL: Record<string, string> = {
  warmth: 'warmth · the room',
  density: 'density · the weight',
  voice: 'voice · who speaks',
  production: 'production · the surface',
  mode: 'mode · the colour',
  tempo: 'tempo · the patience',
  rhythm: 'rhythm · the pull',
  register: 'register · where it sits',
  space: 'space · how far',
};

export function Pairwise() {
  const currentPair = useStore((s) => s.currentPair);
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const recordPairChoice = useStore((s) => s.recordPairChoice);
  const recordPairAlmost = useStore((s) => s.recordPairAlmost);
  const nextPair = useStore((s) => s.nextPair);

  const pair = PAIRS[currentPair];
  const chosen = pairChoices[currentPair];

  const midsetComment = useMemo(
    () => computeMidsetComment(pairChoices, pairLatencies, currentPair),
    [pairChoices, pairLatencies, currentPair]
  );

  const shownAt = useRef(0);
  const [transitioning, setTransitioning] = useState(false);
  const [hover, setHover] = useState<Side | null>(null);

  useEffect(() => {
    shownAt.current = performance.now();
    setTransitioning(false);
    setHover(null);
  }, [currentPair]);

  const commit = (side: Side) => {
    if (chosen || transitioning) return;
    const latency = performance.now() - shownAt.current;
    // If the user hovered the other side just before committing, record it
    // as a "considered but rejected" signal (Stillman 2018 conflict marker).
    if (hover && hover !== side) {
      recordPairAlmost(currentPair, hover);
    }
    recordPairChoice(currentPair, side, latency);
    setTransitioning(true);
    setHover(null);
    setTimeout(() => nextPair(), ACK_MS);
  };

  const committedMarks = pairChoices
    .map((side, i) =>
      side ? { i, dip: side === 'a' ? ('left' as const) : ('right' as const) } : null
    )
    .filter((m): m is { i: number; dip: 'left' | 'right' } => !!m);

  const cueText = transitioning ? undefined : 'choose the one you would keep';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Score
        variant="cream"
        pageTitle="ii. spectrum"
        pageNumber={`${currentPair + 1} / ${PAIRS.length}`}
        voiceCue={cueText}
        footer={AXIS_LABEL[pair.axis]}
        staves={[{ y: STAVE_Y }]}
        overlay={
          <>
            {/* Pair audio — auto-plays clip A, switches on hover, holds the
                chosen clip through the commit-acknowledgement window. */}
            <PairAudio
              axis={pair.axis}
              hoverSide={hover}
              chosenSide={chosen ?? null}
              resetKey={currentPair}
            />

            {midsetComment && (
              <div
                style={{
                  position: 'absolute',
                  top: '12%',
                  left: 32,
                  right: 32,
                  textAlign: 'center',
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: COLORS.scoreAmber,
                  opacity: 0.92,
                  letterSpacing: '0.01em',
                  animation: 'sceneFade 1.6s ease-out',
                }}
              >
                {midsetComment}
              </div>
            )}
            <WordBlock
              side="left"
              label={pair.a.label}
              desc={pair.a.desc}
              shape={pair.a.shape}
              hover={hover === 'a'}
              committed={chosen === 'a'}
              dim={!!chosen && chosen !== 'a'}
              onEnter={() => !chosen && !transitioning && setHover('a')}
              onLeave={() => hover === 'a' && setHover(null)}
              onCommit={() => commit('a')}
            />
            <WordBlock
              side="right"
              label={pair.b.label}
              desc={pair.b.desc}
              shape={pair.b.shape}
              hover={hover === 'b'}
              committed={chosen === 'b'}
              dim={!!chosen && chosen !== 'b'}
              onEnter={() => !chosen && !transitioning && setHover('b')}
              onLeave={() => hover === 'b' && setHover(null)}
              onCommit={() => commit('b')}
            />
          </>
        }
      >
        {committedMarks.map(({ i, dip }) => {
          const x = MARGIN_X + i * MARK_SPACING + MARK_SPACING / 2;
          return (
            <g key={i} transform={`translate(${x}, ${STAVE_Y + 6})`}>
              <Linea size={MARK_SPACING * 0.8} dip={dip} color={COLORS.inkCream} opacity={0.85} />
            </g>
          );
        })}
      </Score>
    </div>
  );
}

interface WordBlockProps {
  side: 'left' | 'right';
  label: string;
  desc: string;
  shape: WaveShape;
  hover: boolean;
  committed: boolean;
  dim: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onCommit: () => void;
}

function WordBlock({ side, label, desc, shape, hover, committed, dim, onEnter, onLeave, onCommit }: WordBlockProps) {
  const color = committed
    ? COLORS.scoreAmber
    : dim
    ? COLORS.inkCreamSecondary
    : hover
    ? COLORS.inkCream
    : COLORS.inkCreamSecondary;

  const wfState: 'idle' | 'hover' | 'committed' | 'dim' =
    committed ? 'committed' : dim ? 'dim' : hover ? 'hover' : 'idle';

  return (
    <button
      type="button"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={onCommit}
      style={{
        position: 'absolute',
        top: '24%',
        [side]: '6%',
        width: '42%',
        background: 'transparent',
        border: 'none',
        padding: '12px 8px',
        textAlign: side === 'left' ? 'left' : 'right',
        fontFamily: FONTS.serif,
        fontStyle: 'italic',
        fontSize: 26,
        color,
        lineHeight: 1.2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        gap: 10,
        cursor: committed || dim ? 'default' : 'pointer',
        transition: 'color 0.25s, opacity 0.25s',
        opacity: dim ? 0.55 : 1,
      }}
    >
      <div>{label.toLowerCase()}</div>
      <PairWaveform shape={shape} state={wfState} align={side} height={42} bars={28} />
      <div style={{ fontSize: 13, color: COLORS.inkCreamSecondary, lineHeight: 1.3 }}>{desc}</div>
    </button>
  );
}
