'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { NOTES } from '@/data/notes';
import { scoreArchetypes } from '@/lib/scoring';

export function NotesDrawer() {
  const [open, setOpen] = useState(false);
  const phase = useStore((s) => s.phase);
  const pairChoices = useStore((s) => s.pairChoices);
  const pairLatencies = useStore((s) => s.pairLatencies);
  const emotionTiles = useStore((s) => s.emotionTiles);

  const note = NOTES[phase];

  const ranked = useMemo(
    () => scoreArchetypes(pairChoices, pairLatencies, emotionTiles),
    [pairChoices, pairLatencies, emotionTiles]
  );

  const showCoverage = phase >= 1;
  const top = ranked[0]?.score ?? 0;
  const margin = top - (ranked[1]?.score ?? 0);
  const viableCount = ranked.filter((a) => a.score > top - 0.2).length;
  const tracksLeft = viableCount * 4;

  return (
    <>
      <button
        type="button"
        className="notes-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Design notes & research citations"
        aria-label="Toggle design notes"
      >
        𝓘
      </button>

      <aside className={`notes-drawer${open ? ' open' : ''}`}>
        <button
          type="button"
          className="notes-close"
          onClick={() => setOpen(false)}
          aria-label="Close notes"
        >
          ×
        </button>

        {note && (
          <>
            <div className="notes-eyebrow">{note.eyebrow}</div>
            <div className="notes-title">{note.title}</div>
            {note.sections.map((s, i) => (
              <div key={i} className="notes-section">
                <h4>{s.h}</h4>
                <p>{s.p}</p>
              </div>
            ))}

            {phase === 0 && (
              <div className="divergence">
                <h4>Divergence from project file</h4>
                <p>
                  This redesign updates the original 6-phase profiling per the literature
                  synthesis. Departures: archetype renaming (internal IDs preserved as{' '}
                  <em>mellow_contemplative</em>, <em>sophisticated_melancholic</em>, etc.);
                  GEMS-9/Cowen-13 discrete-emotion layer added on top of AVD; Spectrum
                  word-pairs replaced with audio forced-choice (Phase 1); Textures merged
                  into Phase 1; threshold rite (Phase 0) and Forer mirror (Phase 5) added.
                  The Moment phase is restored from project file as Phase 4 with the
                  prescribed Hurley liking probe.
                </p>
              </div>
            )}

            {showCoverage && (
              <div className="lib-coverage">
                <h4>Library Coverage</h4>
                <div className="lib-summary">
                  24 tracks · <strong>{tracksLeft}</strong> still viable · margin{' '}
                  <strong>{(margin * 100).toFixed(0)}%</strong> over runner-up
                </div>
                <ul className="arc-list">
                  {ranked.map((a, i) => {
                    let cls = 'pruned';
                    if (i === 0) cls = 'leading';
                    else if (a.score > top - 0.2) cls = 'viable';
                    return (
                      <li key={a.id} className={cls}>
                        <span className="arc-name">{a.name}</span>
                        <span className="arc-score">{(a.score * 100).toFixed(0)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {note.refs && (
              <div className="citations">
                <h4>Citations</h4>
                {note.refs.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
