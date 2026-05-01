'use client';

/**
 * Pre-experience welcome — screening + informed consent. Required safeguards
 * per Research/ego-dissolution-postlistener-architecture §Ethical architecture.
 *
 * Screening: four binary questions. Any "yes" sets `gentlePath`, which the
 * Listening engine will use to (Phase B follow-up) skip the deepest peak.
 *
 * Consent: explicit framing of dissolution, time-bounded promise, exit path.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Paper } from '@/score/Paper';
import { COLORS, FONTS } from '@/score/tokens';
import { useStore } from '@/lib/store';

type Stage = 'intro' | 'screen' | 'consent' | 'gentle-confirm';

const QUESTIONS: { key: keyof ReturnType<typeof useStore.getState>['screeningFlags']; text: string }[] = [
  { key: 'psychosis',    text: 'history of psychotic disorder (schizophrenia, bipolar I)?' },
  { key: 'dissociation', text: 'history of dissociative disorder?' },
  { key: 'ptsd',         text: 'currently in active PTSD treatment?' },
  { key: 'distressed',   text: 'currently in significant emotional distress?' },
];

export function Welcome() {
  const setScreened = useStore((s) => s.setScreened);
  const setConsented = useStore((s) => s.setConsented);
  const gentlePath = useStore((s) => s.gentlePath);

  const [stage, setStage] = useState<Stage>('intro');
  const [answers, setAnswers] = useState({ psychosis: false, dissociation: false, ptsd: false, distressed: false });

  const onScreenComplete = () => {
    setScreened(answers);
    if (answers.psychosis || answers.dissociation || answers.ptsd || answers.distressed) {
      setStage('gentle-confirm');
    } else {
      setStage('consent');
    }
  };

  const onConsent = () => {
    setConsented();
    // Welcome will unmount — page.tsx routes on `screened && consentedAt`.
  };

  return (
    <Paper variant="cream">
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 28 }}>
        {stage === 'intro' && (
          <>
            <p style={{ fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 19, color: COLORS.inkCream, textAlign: 'center', maxWidth: 320, lineHeight: 1.55, margin: 0 }}>
              this is a sixteen-minute audio piece. it asks you to listen,
              to choose, and at the end to let go.
            </p>
            <button onClick={() => setStage('screen')} style={btnStyle()}>BEGIN</button>
          </>
        )}

        {stage === 'screen' && (
          <>
            <p style={{ fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 16, color: COLORS.inkCream, textAlign: 'center', maxWidth: 340, margin: 0 }}>
              four short questions. honest answers shape a gentler version if needed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 380 }}>
              {QUESTIONS.map((q) => (
                <label key={q.key} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 14, color: COLORS.inkCream }}>
                  <input
                    type="checkbox"
                    checked={answers[q.key]}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.checked }))}
                  />
                  {q.text}
                </label>
              ))}
            </div>
            <button onClick={onScreenComplete} style={btnStyle()}>CONTINUE</button>
          </>
        )}

        {stage === 'gentle-confirm' && (
          <>
            <p style={{ fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 17, color: COLORS.inkCream, textAlign: 'center', maxWidth: 360, lineHeight: 1.55, margin: 0 }}>
              thank you. you&apos;ll get a softer version of this piece — shorter peak,
              gentler dissolution. you can stop at any time.
            </p>
            <button onClick={() => setStage('consent')} style={btnStyle()}>OK</button>
          </>
        )}

        {stage === 'consent' && (
          <>
            <p style={{ fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 15, color: COLORS.inkCream, textAlign: 'center', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
              this piece is designed to create a feeling of letting go.
              you will choose, you will conduct, you will dissolve, you will return.
              everything you experience is temporary and part of the design.
              you can remove your headphones or close the browser at any time.
            </p>
            {gentlePath && (
              <p style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.18em', color: COLORS.scoreAmber, textAlign: 'center', opacity: 0.85, margin: 0 }}>
                gentle path engaged
              </p>
            )}
            <button onClick={onConsent} style={btnStyle()}>I AGREE — BEGIN</button>
          </>
        )}
      </div>
    </Paper>
  );
}

function btnStyle(): CSSProperties {
  return {
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: '0.2em',
    padding: '12px 22px',
    background: 'transparent',
    color: COLORS.inkCream,
    border: `0.6px solid ${COLORS.inkCream}`,
    borderRadius: 0,
    cursor: 'pointer',
  };
}
