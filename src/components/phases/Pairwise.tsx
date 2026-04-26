'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Score, MARGIN_X, VB_W } from '@/score/Score';
import { Linea } from '@/score/marks';
import { COLORS, FONTS } from '@/score/tokens';
import { PAIRS } from '@/data/pairs';
import { useStore } from '@/lib/store';
import type { Side } from '@/types';

const STAVE_Y = 320;
const STAVE_WIDTH = VB_W - MARGIN_X * 2;
const MARK_SPACING = STAVE_WIDTH / PAIRS.length;
const LEAN_THRESHOLD = 0.32;
const COMMIT_DURATION = 2500; // ms held past threshold to commit

const AXIS_LABEL: Record<string, string> = {
  arousal: 'arousal · pulse',
  valence: 'valence · feeling',
  depth: 'depth · interior',
};

export function Pairwise() {
  const currentPair = useStore((s) => s.currentPair);
  const pairChoices = useStore((s) => s.pairChoices);
  const recordPairChoice = useStore((s) => s.recordPairChoice);
  const nextPair = useStore((s) => s.nextPair);

  const pair = PAIRS[currentPair];
  const chosen = pairChoices[currentPair];

  const shownAt = useRef(0);
  const [transitioning, setTransitioning] = useState(false);
  const [cursor, setCursor] = useState(0); // -1..1
  const [holding, setHolding] = useState<{ side: Side; progress: number } | null>(null);
  const holdRef = useRef<{ side: Side; startedAt: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pointerActive = useRef(false);

  useEffect(() => {
    shownAt.current = performance.now();
    setTransitioning(false);
    setCursor(0);
    setHolding(null);
    holdRef.current = null;
  }, [currentPair]);

  const commit = (side: Side) => {
    if (chosen || transitioning) return;
    const latency = performance.now() - shownAt.current;
    recordPairChoice(currentPair, side, latency);
    setTransitioning(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setHolding(null);
    setTimeout(() => nextPair(), 700);
  };

  // Continuous loop: while pointer is active, evaluate cursor + hold timing.
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const hold = holdRef.current;
      if (hold) {
        const elapsed = performance.now() - hold.startedAt;
        const progress = Math.min(1, elapsed / COMMIT_DURATION);
        setHolding({ side: hold.side, progress });
        if (progress >= 1) {
          commit(hold.side);
          holdRef.current = null;
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentPair, transitioning]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFromPointer = (clientX: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const norm = (clientX - rect.left) / rect.width; // 0..1
    const pos = (norm - 0.5) * 2; // -1..1
    setCursor(pos);

    if (Math.abs(pos) > LEAN_THRESHOLD) {
      const side: Side = pos < 0 ? 'a' : 'b';
      if (!holdRef.current || holdRef.current.side !== side) {
        holdRef.current = { side, startedAt: performance.now() };
      }
    } else if (holdRef.current) {
      holdRef.current = null;
      setHolding(null);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (chosen || transitioning) return;
    pointerActive.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (chosen || transitioning) return;
    // Allow hover-driven movement on desktop without requiring pointerdown.
    if (e.pointerType === 'mouse' || pointerActive.current) {
      updateFromPointer(e.clientX);
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointerActive.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    // Soft tap: if cursor is past threshold, allow immediate commit.
    if (!chosen && !transitioning && Math.abs(cursor) > LEAN_THRESHOLD + 0.15) {
      commit(cursor < 0 ? 'a' : 'b');
    } else {
      holdRef.current = null;
      setHolding(null);
    }
  };
  const onPointerLeave = () => {
    pointerActive.current = false;
    holdRef.current = null;
    setHolding(null);
  };

  const cursorSvgX = MARGIN_X + STAVE_WIDTH / 2 + cursor * (STAVE_WIDTH / 2);

  // Marks for previously committed pairs
  const committedMarks = pairChoices
    .map((side, i) =>
      side ? { i, dip: side === 'a' ? ('left' as const) : ('right' as const) } : null
    )
    .filter((m): m is { i: number; dip: 'left' | 'right' } => !!m);

  const cueText = transitioning
    ? undefined
    : holding
    ? 'hold'
    : Math.abs(cursor) > LEAN_THRESHOLD
    ? 'hold'
    : 'lean toward a word';

  return (
    <div
      ref={surfaceRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerLeave}
      onPointerLeave={onPointerLeave}
      style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'pointer' }}
    >
      <Score
        variant="cream"
        pageTitle="ii. spectrum"
        pageNumber={`${currentPair + 1} / ${PAIRS.length}`}
        voiceCue={cueText}
        footer={AXIS_LABEL[pair.axis]}
        staves={[{ y: STAVE_Y }]}
        overlay={
          <>
            <WordBlock
              side="left"
              label={pair.a.label}
              desc={pair.a.desc}
              active={cursor < -0.2}
              committed={chosen === 'a'}
              holdProgress={holding?.side === 'a' ? holding.progress : 0}
            />
            <WordBlock
              side="right"
              label={pair.b.label}
              desc={pair.b.desc}
              active={cursor > 0.2}
              committed={chosen === 'b'}
              holdProgress={holding?.side === 'b' ? holding.progress : 0}
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
        {!chosen && !transitioning && (
          <circle cx={cursorSvgX} cy={STAVE_Y + 6} r="3" fill={COLORS.scoreAmber} />
        )}
      </Score>
    </div>
  );
}

interface WordBlockProps {
  side: 'left' | 'right';
  label: string;
  desc: string;
  active: boolean;
  committed: boolean;
  holdProgress: number;
}

function WordBlock({ side, label, desc, active, committed, holdProgress }: WordBlockProps) {
  const color = committed ? COLORS.scoreAmber : active ? COLORS.inkCream : COLORS.inkCreamSecondary;
  return (
    <div
      style={{
        position: 'absolute',
        top: '36%',
        [side]: '8%',
        width: '40%',
        textAlign: side === 'left' ? 'left' : 'right',
        fontFamily: FONTS.serif,
        fontStyle: 'italic',
        fontSize: 26,
        color,
        lineHeight: 1.2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        gap: 8,
        pointerEvents: 'none',
        transition: 'color 0.3s',
      }}
    >
      {holdProgress > 0 && (
        <div
          style={{
            height: 1.5,
            background: COLORS.scoreAmber,
            opacity: 0.25 + holdProgress * 0.55,
            width: `${holdProgress * 100}%`,
            [side === 'right' ? 'marginLeft' : 'marginRight']: 'auto',
            transition: 'width 0.08s linear',
          }}
        />
      )}
      <div>{label.toLowerCase()}</div>
      <div style={{ fontSize: 13, color: COLORS.inkCreamSecondary, lineHeight: 1.3 }}>{desc}</div>
    </div>
  );
}
