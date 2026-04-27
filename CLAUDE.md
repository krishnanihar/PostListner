# PostListener — engineering notes

A 5-minute interactive musical-identity rite that produces a felt-personalised
generated track, scored as sheet music. Next.js 15 + React 19 + Zustand. Voice
+ music via ElevenLabs.

The thesis-defensible posture is **felt-personalization scaffold**, not a
psychometric instrument — see [Research/taste-extraction-postlistener-orchestra.md](Research/taste-extraction-postlistener-orchestra.md).

## Phase map

11 phases total. Phases 0–6 are the 5-minute rite; 7–10 are the post-rite
arc into the Orchestra.

| # | Phase | Component | Notes |
|---|---|---|---|
| 0 | Threshold | [Threshold.tsx](src/components/phases/Threshold.tsx) | Name capture · 60Hz drone · 6s held-tap breath × 2 · threshold statement |
| 1 | Spectrum | [Pairwise.tsx](src/components/phases/Pairwise.tsx) | 9 forced-choice pairs along production-aesthetic axes · waveforms · audio clips |
| 2 | Emotion | [Gems.tsx](src/components/phases/Gems.tsx) | 3 × 15s GEMS excerpts · 6 emotion tiles · mid-set Forer probe |
| 3 | Carry | [ThreeSongs.tsx](src/components/phases/ThreeSongs.tsx) | 3 Rathbone prompts · iTunes Search autocomplete · year metadata |
| 4 | Moment | [Moment.tsx](src/components/phases/Moment.tsx) | Tap-rhythm BPM · 7-point Hurley liking · auditioning track |
| 5 | **Reflection** | [Reflection.tsx](src/components/phases/Reflection.tsx) | Reads back user signals — the felt-personalization bridge |
| 6 | Mirror | [Mirror.tsx](src/components/phases/Mirror.tsx) | Archetype reveal · Forer paragraphs · memory callback · pair residue |
| 7 | Composing (Wait) | [Wait.tsx](src/components/phases/Wait.tsx) | Generation-window ritual — currently a fake timer |
| 8 | Recognition (Reveal) | [Reveal.tsx](src/components/phases/Reveal.tsx) | Anagnorisis — silence then title |
| 9 | Orchestra (Listening) | [Listening.tsx](src/components/phases/Listening.tsx) | Placeholder — gesture/HRTF/4-stem not wired |
| 10 | Silence | [Silence.tsx](src/components/phases/Silence.tsx) | Inverse separation — input goes nowhere by design |

**Reflection (5) is inserted between Moment and Mirror** — when reading old
research notes, the original numbering had Mirror at 5. All `setPhase(N)`
calls in components reflect the post-insertion numbering. `POST_RITE_PHASE`
in [TopBar.tsx](src/components/TopBar.tsx) is 7.

## Key directories

- [src/app/page.tsx](src/app/page.tsx) — phase router
- [src/components/phases/](src/components/phases/) — one file per phase
- [src/score/](src/score/) — score-paper visual primitives (Paper, Stave, marks, PairWaveform)
- [src/data/](src/data/) — pairs, archetypes, excerpts, songs prompts, notes
- [src/lib/](src/lib/) — store (zustand), scoring, reflection helpers, songSearch (iTunes), admirer voice settings, env flags, audioPrompts
- [src/app/api/](src/app/api/) — server routes for admirer (TTS), compose (music), admin/generate (batch)
- [Research/](Research/) — research files the design is grounded in

## Research files

The 5-minute phase is grounded primarily in:
- [Research/ 5-minute-taste-extraction redesign.md](Research/%205-minute-taste-extraction%20redesign.md) — phase-by-phase blueprint
- [Research/taste-extraction-postlistener-orchestra.md](Research/taste-extraction-postlistener-orchestra.md) — orchestra source file (AVD framing, pilot protocol)
- [Research/stealable-techniques-feeling-seen.md](Research/stealable-techniques-feeling-seen.md) — 97 techniques (reflection, attribution, Forer)
- [Research/voice-intimacy-admirer-design.md](Research/voice-intimacy-admirer-design.md) — Admirer voice across phases
- [Research/5-minute-phase-enhancements.md](Research/5-minute-phase-enhancements.md) — current enhancement plan, four tiers

Don't re-derive design decisions from scratch — check these first.

## Scoring architecture

[src/lib/scoring.ts](src/lib/scoring.ts) implements a Burke 2002 cascade hybrid:

1. **Archetype selection** — argmax over `0.7 × AVD-similarity + 0.3 × emotion-tile-overlap`. No stochasticity (a wrong archetype breaks the contract).
2. **Variation selection** (within archetype) — weighted blend of AVD refinement + era match + emotion overlap + tempo match. **ε-greedy at ε=0.12** (memo §1F).

AVD vector is computed from pair commits with **log-RT confidence weighting**
(Stillman 2018: long dwell ≠ preference strength, it's *conflict*). Hover-then-
cancel is captured as a separate "almost" signal in `pairAlmosts[]`.

The 6×4 archetype × variation grid is in [src/data/archetypes.ts](src/data/archetypes.ts).
Each variation has its own AVD target, era, production aesthetic, and emotion
tags. Variation tags are Daylist-style (`2010s · lo-fi piano for cab rides home`).

## Audio architecture

Three buckets, all under [public/audio/](public/audio/):

| Bucket | Files | When generated | Cost per session |
|---|---|---|---|
| `pairs/` | 18 × 8s pair clips | Once via admin/generate | $0 |
| `gems/` | 3 × 15s excerpts | Once | $0 |
| `audition/` | 24 × 30s tracks (one per variation) | Once | $0 |
| `admirer/` | TTS voice lines | First time per (text, register), then cached | $0 after warm |

Plus the **Phase 0 drone** ([Drone.tsx](src/components/Drone.tsx)) which is
pure Web Audio, no file, no API.

The **per-session generated track** for Phase 5 sub-audible fade-up + Phase 7
Wait + Phase 8 Reveal is the only thing designed to be live per session
(temporal-uniqueness claim). **Not yet built** — gated on the user reviewing
voice tone first.

## ElevenLabs API gotchas

- `seed` is **incompatible with `prompt`** (only works with `composition_plan`).
  Prompt-mode requests omit seed entirely.
- `model_id` for music is `"music_v1"` — currently the only option.
- Content moderator flags some prompts (e.g. archetype names like "Velvet
  Mystic"). [src/lib/audioPrompts.ts](src/lib/audioPrompts.ts) sanitizes —
  drops archetype names, keeps musical descriptors.
- TTS model: `eleven_v3` for the Admirer voice (most expressive, 5k char
  limit per call). Voice settings per register in
  [src/lib/admirer.ts](src/lib/admirer.ts).
- Default voice ID: Rachel (`21m00Tcm4TlvDq8ikWAM`). Override with
  `ELEVENLABS_VOICE_ID` env.

## Offline / kill switch

`.env.local` has `NEXT_PUBLIC_POSTLISTENER_OFFLINE`:
- `1` = block all live ElevenLabs calls. Cached voice still serves; static
  audio still plays; drone still works. Uncached lines fall silent.
- `0` (or unset) = live mode.

After toggling, **restart the dev server** (`rm -rf .next && npx next dev`)
so Next picks up the env change.

The check is in [src/lib/env.ts](src/lib/env.ts) (`isOfflineMode()`) and
applied in [api/admirer/route.ts](src/app/api/admirer/route.ts),
[api/compose/route.ts](src/app/api/compose/route.ts), and
[api/admin/generate/route.ts](src/app/api/admin/generate/route.ts).

## Common commands

```bash
npm run dev                        # dev server on :3000
npx tsc --noEmit                   # type-check
npx next build                     # production build sanity

# Audio asset orchestration (all idempotent — only generates missing files):
curl -X POST 'http://localhost:3000/api/admin/generate?dryRun=1'                 # preview work
curl -X POST 'http://localhost:3000/api/admin/generate'                          # full sweep
curl -X POST 'http://localhost:3000/api/admin/generate?bucket=pairs'             # one bucket
curl -X POST 'http://localhost:3000/api/admin/generate?bucket=gems'
curl -X POST 'http://localhost:3000/api/admin/generate?bucket=audition'
```

Hot reload sometimes silently fails to register newly created `.tsx` files
(seen with [PairWaveform.tsx](src/score/PairWaveform.tsx), [Reflection.tsx](src/components/phases/Reflection.tsx)).
Cure: kill the dev server, `rm -rf .next`, restart. Verify with
`grep -l 'YourSymbolName' .next/static/chunks/*.js`.

## Conventions

- **TypeScript strict, React 19, Next.js 15 app router**.
- **Score-paper aesthetic**: cream `#F2EBD8` background, dark ink, amber
  `#D4A053` accent. Dark variant for the Mirror only. Variables in
  [globals.css](src/app/globals.css) and [score/tokens.ts](src/score/tokens.ts).
- **No emojis** anywhere in the UI or code.
- **Fonts**: Iowan Old Style / Palatino / EB Garamond stack for serif;
  JetBrains Mono for mono.
- **State**: zustand store ([src/lib/store.ts](src/lib/store.ts)) is the
  single source. All phase state lives there; nothing in localStorage.
- **Phases auto-advance** via internal timers + `setPhase(N)`. The
  [Controls](src/components/Controls.tsx) prev/next exists for dev only and
  is hidden once `phase >= POST_RITE_PHASE` (the rite is unidirectional).
- **NotesDrawer** ([src/components/NotesDrawer.tsx](src/components/NotesDrawer.tsx))
  surfaces the research justification per phase. Content from
  [src/data/notes.ts](src/data/notes.ts) — keep `phase: N` in sync with
  [src/app/page.tsx](src/app/page.tsx)'s phase array.
