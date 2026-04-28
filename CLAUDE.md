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
| 7 | Composing (Wait) | [Wait.tsx](src/components/phases/Wait.tsx) | Three-act state machine driving `/api/compose`; offline falls back to the audition file for the matched variation |
| 8 | Recognition (Reveal) | [Reveal.tsx](src/components/phases/Reveal.tsx) | Anagnorisis — silence then title; reads `sessionTrackTitle` if Wait set it |
| 9 | Orchestra (Listening) | [Listening.tsx](src/components/phases/Listening.tsx) | Web Audio HRTF + gesture + 6-section dissolution arc; single-source (4-stem separation pending) |
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

The **per-session generated track** for Phase 7 Wait + Phase 8 Reveal +
Phase 9 Listening is wired end-to-end:

- [Wait.tsx](src/components/phases/Wait.tsx) calls `/api/compose` with the
  prompt from [`auditionPrompt(archetype, variation)`](src/lib/audioPrompts.ts)
  and stores the resulting blob URL on the zustand store as
  `sessionTrackUrl` (with `sessionTrackTitle`, `sessionGenStatus`).
- In offline mode (or on any non-200), Wait skips the network and points
  `sessionTrackUrl` at `/audio/audition/{variation.id}.mp3` — guaranteed
  on disk for all 24 variations. Status flips to `fallback` so the footer
  reads "from the archive" instead of "live".
- [Reveal.tsx](src/components/phases/Reveal.tsx) prefers
  `sessionTrackTitle`, falls back to the picked variation tag.
- [Listening.tsx](src/components/phases/Listening.tsx) plays
  `sessionTrackUrl` through a Web Audio graph and revokes the blob URL
  on unmount.

**Still TODO on the music side**: a proper
AVD-vector-to-`composition_plan` renderer (currently the same prompt
shape as audition clips, just for `lengthMs: 60_000`), and the HTDemucs
4-stem separation that would let Listening route real `vocals · drums ·
bass · other` rather than spectral-bucket onsets on a single source.

## Listening engine (Phase 9)

[Listening.tsx](src/components/phases/Listening.tsx) hosts a
`ListeningEngine` class that owns all Web Audio state — the React
component is a thin lifecycle wrapper.

Graph (top to bottom):

```
HTMLAudioElement (sessionTrackUrl, looping)
  → MediaElementSource
  → BiquadFilter (lowpass, gesture-controlled cutoff)
  → split:  dry → dryGain
            wet → ConvolverNode (synthesized 0.6s room IR) → wetGain
  → PannerNode (panningModel='HRTF', distanceModel='inverse')
  → masterGain
  → AnalyserNode (taps off master for onset detection)
  → ctx.destination
```

**Six-section dissolution arc** (3 min total prototype, not the full 6
min from `Research/ego-dissolution-postlistener-architecture` —
expand once the real composition is rendered):

1. `threshold`  0–30s  — center, bright, low wet
2. `release`    30–75s — pan drift widens, lowpass narrows, wet rises
3. `peak`       75–120s — Bregman cue degradation: ±22c detune via `playbackRate`, wet 0.7, lowpass 1500Hz
4. `return`     120–150s — params resolve back toward center
5. `homecoming` 150–170s — clean and slightly slower
6. `silence`    170–180s — masterGain ramps to 0, then `setPhase(10)`

Cross-fades the last 1.5s of each section into the next so the seams
are inaudible.

**Gesture mapping** (`Research/gesture-felt-agency`): listens on
`deviceorientation` + `devicemotion`. iOS 13+ requires permission, so
the UI gates engine start behind a "BEGIN" button that calls
`DeviceOrientationEvent.requestPermission()` AND resumes the
AudioContext on the same gesture. Smoothing is a single-pole low-pass
(α≈0.18) — adequate for prototype; full 1€ filter is the upgrade path.

| Sensor | Mapping | Range |
|---|---|---|
| roll (γ) | `panner.positionX` | ±1.2 added to section drift |
| pitch (β) | filter cutoff (logarithmic) | × 2^±1 octave |
| `\|accel\|` | masterGain bump | +0.08 |

**Pointer fallback** — when no device events fire (desktop), pointer
x/y over the SVG drives roll + pitch directly.

**Onset visual** — the AnalyserNode RMS-derivative emits onsets;
spectral centroid buckets them into one of the four staves. NOT real
4-stem separation; explicitly a visual proxy. Marks decay over ~6s so
the page never crowds.

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
