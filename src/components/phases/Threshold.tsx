'use client';

import { useEffect, useRef, useState } from 'react';
import { Paper } from '@/score/Paper';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';
import { AdmirerLine } from '@/components/AdmirerLine';
import { Drone } from '@/components/Drone';

/**
 * Phase 0 — Threshold (Van Gennep separation rite).
 *
 * Memo §1D: silence outperforms calming music for parasympathetic shift
 * (Bernardi 2006); 6s exhale produces HRV resonance shift in fractions
 * of a minute (Lehrer & Gevirtz 2014); first-name address pre-engages
 * dorsal mPFC (Janata 2009); hand-on-chest is the embodied mask-donning
 * analogue (MIT Punchdrunk 2014).
 *
 * Sequence:
 *   1. headphones cue   (motor: tap to begin)
 *   2. name capture     (motor: type + enter — Janata mPFC engagement)
 *   3. breath cycle ×2  (somatic: hand on chest + 6s exhale visual)
 *   4. threshold line   (cognitive: discontinuity statement)
 *   5. handoff          (auto-advance into Phase 1)
 */

type Stage = 'headphones' | 'name' | 'breath1' | 'breath2' | 'threshold';

const BREATH_MS = 6000;
const THRESHOLD_HOLD_MS = 3500;

export function Threshold() {
  const userName = useStore((s) => s.userName);
  const setUserName = useStore((s) => s.setUserName);
  const setPhase = useStore((s) => s.setPhase);

  const [stage, setStage] = useState<Stage>('headphones');
  const [draftName, setDraftName] = useState(userName);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === 'name') nameRef.current?.focus();
  }, [stage]);

  // Threshold is the only auto-advanced beat — the breath stages are
  // user-driven (require sustained held-tap to complete).
  useEffect(() => {
    if (stage === 'threshold') {
      const t = window.setTimeout(() => setPhase(1), THRESHOLD_HOLD_MS);
      return () => clearTimeout(t);
    }
  }, [stage, setPhase]);

  const onNameSubmit = () => {
    const v = draftName.trim();
    if (!v) return;
    setUserName(v);
    setStage('breath1');
  };

  // 60Hz drone runs from name capture through the threshold statement.
  // Bernardi 2006 — silence-but-not-music underneath the breath cycle.
  const droneActive =
    stage === 'name' || stage === 'breath1' || stage === 'breath2' || stage === 'threshold';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {droneActive && <Drone freq={60} gain={0.05} />}
      <Paper variant="cream">
        {stage === 'headphones' && (
          <div
            onClick={() => setStage('name')}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 32,
              cursor: 'pointer',
              animation: 'sceneFade 0.8s ease-out',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.inkCreamSecondary}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <span
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 14,
                color: COLORS.inkCreamSecondary,
                letterSpacing: '0.03em',
              }}
            >
              wear headphones
            </span>
            <span
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 14,
                color: COLORS.scoreAmber,
                marginTop: 24,
                animation: 'breathing 2.5s ease-in-out infinite',
              }}
            >
              tap to begin
            </span>
          </div>
        )}

        {stage === 'name' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              gap: 28,
              animation: 'sceneFade 0.8s ease-out',
            }}
          >
            <p
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 18,
                color: COLORS.inkCream,
                textAlign: 'center',
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              what should I call you?
            </p>
            <div style={{ width: '70%', maxWidth: 280 }}>
              <input
                ref={nameRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onNameSubmit()}
                placeholder="your first name"
                autoComplete="off"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `0.5px solid ${COLORS.inkCreamSecondary}`,
                  outline: 'none',
                  padding: '8px 4px',
                  fontFamily: FONTS.serif,
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: COLORS.inkCream,
                  textAlign: 'center',
                }}
              />
              <div
                style={{
                  marginTop: 8,
                  fontFamily: FONTS.mono,
                  fontSize: 9,
                  letterSpacing: '0.18em',
                  color: COLORS.inkCreamSecondary,
                  textAlign: 'center',
                  opacity: 0.6,
                }}
              >
                press enter
              </div>
            </div>
          </div>
        )}

        {stage === 'breath1' && (
          <BreathStage name={userName} second={false} onComplete={() => setStage('breath2')} />
        )}
        {stage === 'breath2' && (
          <BreathStage name={userName} second={true} onComplete={() => setStage('threshold')} />
        )}

        {stage === 'threshold' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              animation: 'sceneFade 1.2s ease-out',
            }}
          >
            <p
              style={{
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 19,
                color: COLORS.inkCream,
                textAlign: 'center',
                lineHeight: 1.55,
                margin: 0,
                maxWidth: 280,
              }}
            >
              for the next sixteen minutes
              <br />
              you are not your inbox.
            </p>
            <AdmirerLine
              text="for the next sixteen minutes you are not your inbox."
              register="caretaking"
              delayMs={400}
            />
          </div>
        )}
      </Paper>

      <style jsx>{`
        @keyframes breathing {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}

interface BreathStageProps {
  name: string;
  second: boolean;
  onComplete: () => void;
}

/**
 * 6-second held-tap exhale. Ring contracts continuously while the user
 * presses; if released early, ring resets and the user must restart.
 *
 * This is the somatic mask-donning analogue from MIT/Punchdrunk's *Sleep
 * No More* analysis (2014) — a real motor commitment, not just text. The
 * resonance-frequency window per Lehrer & Gevirtz 2014 still applies:
 * the breath becomes physiologically meaningful only if it's actually
 * sustained. Released-early reset is intentional rigour.
 */
function BreathStage({ name, second, onComplete }: BreathStageProps) {
  const [showRing, setShowRing] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const pressStartedAt = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // Reset on stage change. Show cue alone for ~1.1s, then enable the ring.
  useEffect(() => {
    setShowRing(false);
    setPressing(false);
    setProgress(0);
    pressStartedAt.current = null;
    completedRef.current = false;
    const t = window.setTimeout(() => setShowRing(true), 1100);
    return () => {
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [second]);

  const startPress = () => {
    if (completedRef.current) return;
    setPressing(true);
    pressStartedAt.current = performance.now();
    const tick = () => {
      if (completedRef.current) return;
      const elapsed = performance.now() - (pressStartedAt.current ?? 0);
      const p = Math.min(1, elapsed / BREATH_MS);
      setProgress(p);
      if (p >= 1) {
        completedRef.current = true;
        setPressing(false);
        // Brief hold on the still-point before handing off to the parent.
        window.setTimeout(() => onComplete(), 700);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancelPress = () => {
    if (completedRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPressing(false);
    pressStartedAt.current = null;
    setProgress(0);
  };

  const cue = second
    ? 'once more.'
    : `${name}. place your hand on your chest. breathe out — slowly.`;

  // Voice line: same as cue. Caretaking register. Plays alongside the
  // visual cue. Browsers allow autoplay because the user has already
  // tapped to begin + pressed Enter on the name field.
  const voiceText = second
    ? 'once more.'
    : `${name}. place your hand on your chest. breathe out, slowly.`;

  // Ring scale: 1 (full) → 0.18 (collapsed) as progress goes 0 → 1.
  const ringScale = 1 - progress * 0.82;

  // Instruction text adapts to interaction state.
  const instruction = completedRef.current
    ? ''
    : pressing
    ? 'hold'
    : progress > 0
    ? 'try again — keep holding'
    : 'press and hold the circle';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        padding: 32,
        animation: 'sceneFade 0.8s ease-out',
      }}
    >
      <p
        style={{
          fontFamily: FONTS.serif,
          fontStyle: 'italic',
          fontSize: second ? 18 : 16,
          color: COLORS.inkCream,
          textAlign: 'center',
          lineHeight: 1.5,
          margin: 0,
          maxWidth: 280,
          opacity: 0.94,
        }}
      >
        {cue}
      </p>

      <div
        role="button"
        aria-label="Press and hold for the breath"
        tabIndex={0}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        style={{
          width: 180,
          height: 180,
          position: 'relative',
          touchAction: 'none',
          cursor: completedRef.current ? 'default' : 'pointer',
          opacity: showRing ? 1 : 0,
          transition: 'opacity 0.8s ease-out',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <svg viewBox="0 0 180 180" width="180" height="180">
          {/* Outer reference ring — full lung */}
          <circle
            cx="90"
            cy="90"
            r="80"
            fill="none"
            stroke={COLORS.inkCreamSecondary}
            strokeWidth="0.6"
            opacity="0.35"
          />
          {/* Contracting ring — driven by held progress */}
          <circle
            cx="90"
            cy="90"
            r="80"
            fill="none"
            stroke={COLORS.scoreAmber}
            strokeWidth={pressing ? 1.6 : 1.2}
            style={{
              transformOrigin: '90px 90px',
              transform: `scale(${ringScale})`,
              opacity: pressing ? 0.95 : 0.7,
              transition: pressing
                ? 'opacity 0.2s ease-out, stroke-width 0.2s ease-out'
                : 'transform 0.4s ease-out, opacity 0.4s, stroke-width 0.2s',
            }}
            vectorEffect="non-scaling-stroke"
          />
          {/* Centre point — the still place at the end of the breath */}
          <circle cx="90" cy="90" r="2" fill={COLORS.inkCream} opacity="0.7" />
        </svg>
      </div>

      <p
        style={{
          fontFamily: FONTS.mono,
          fontSize: 9,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: COLORS.inkCreamSecondary,
          textAlign: 'center',
          margin: 0,
          opacity: showRing && instruction ? 0.7 : 0,
          transition: 'opacity 0.5s ease-out',
          minHeight: 12,
        }}
      >
        {instruction}
      </p>

      <AdmirerLine text={voiceText} register="caretaking" delayMs={300} />
    </div>
  );
}
