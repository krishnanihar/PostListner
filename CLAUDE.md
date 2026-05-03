# PostListener — engineering notes

A ~16-minute interactive musical-identity rite — a 5-minute taste-extraction
front-end producing a felt-personalised generated track, then a 6-minute
dissolution-and-return arc through that track, then silence. Scored as sheet
music throughout. Next.js 15 + React 19 + Zustand. Voice + music via
ElevenLabs. 4-stem separation via a HTDemucs Python sidecar.

The thesis-defensible posture is **felt-personalization scaffold**, not a
psychometric instrument — see [Research/taste-extraction-postlistener-orchestra.md](Research/taste-extraction-postlistener-orchestra.md).

## Demo mode — temporary (REVERT BEFORE DEFENSE)

To unblock a Vercel deploy + mobile testing, the live music-generation
pipeline has been **gutted**. Phase 9 is hardcoded to one pre-baked track +
4 demucs stems via the `DEMO_TRACK` constant in
[Wait.tsx](src/components/phases/Wait.tsx). Mirror's archetype selection
still varies per user; everything from Wait → Reveal → Listening is fixed
to `late_night_2020s_neoclassical`.

**Removed from the codebase** (recover from git history):
- `src/app/api/compose/route.ts` — ElevenLabs Music API proxy
- `src/app/api/admin/generate/route.ts` — batch audition-clip generator
- `src/app/api/stems/route.ts` — demucs sidecar proxy
- `src/lib/compositionPlan.ts` — 6-min `composition_plan` builder
- `src/lib/audioPrompts.ts` — prompt sanitizer used by admin/generate
- `services/demucs/` — Python+FastAPI HTDemucs sidecar
- `jszip` + `@types/jszip` deps — were only used to unzip stems from
  `/api/stems`

**Still functional**:
- `/api/admirer` — Admirer TTS voice (live ElevenLabs)
- The 30s placeholder audition clips in
  [public/audio/audition/](public/audio/audition/) — used by Phase 4 (Moment)
- The full rite UI (Welcome → Mirror) — every phase except Wait/Reveal/Listening
  behaves normally
- [scripts/generate-demo-track.mjs](scripts/generate-demo-track.mjs) —
  standalone Node script to regenerate the 6-min demo track via direct
  ElevenLabs `/v1/music` call. Self-contained; doesn't depend on the deleted
  lib files. Outputs to `public/audio/audition/late_night_2020s_neoclassical.mp3`.
- Stems for the demo track live in
  `public/audio/stems/late_night_2020s_neoclassical/{vocals,drums,bass,other}.mp3`
  (4 × ~8.6MB, generated locally via demucs htdemucs).

**To revert** (when going back to live per-archetype generation):
1. `git log` for the deletion commit, restore the 7 paths above
2. Set `DEMO_TRACK = null` in [Wait.tsx](src/components/phases/Wait.tsx) and
   restore the live-fetch useEffect from git history
3. `npm install jszip @types/jszip`
4. Re-host demucs somewhere reachable (Fly.io / Railway / Modal — Vercel
   can't host it). Set `DEMUCS_URL` env on the Next.js side.
5. Note the ElevenLabs `composition_plan` schema drift discovered during
   demo work: each section now requires a `lines: []` field (string array;
   instrumental tracks pass `[]`). The deleted [compositionPlan.ts](src/lib/compositionPlan.ts)
   did **not** emit `lines`, so it would 422 against current API. Fix when
   restoring.
6. Update CLAUDE.md to remove this section

The sections below describe the **target** architecture; treat them as the
state to restore, not the current state.

## Phase map

11 phases total, plus a pre-Phase-0 **Welcome** gateway. Phases 0–6 are the
5-minute rite; 7–10 are the post-rite arc into the Orchestra.

| # | Phase | Component | Notes |
|---|---|---|---|
| — | **Welcome** | [Welcome.tsx](src/components/phases/Welcome.tsx) | Pre-experience screening (4 flags) + informed consent. Gates phase 0 in [page.tsx](src/app/page.tsx) on `screened && consentedAt`. Sets `gentlePath` if any flag is true |
| 0 | Threshold | [Threshold.tsx](src/components/phases/Threshold.tsx) | Name capture · 60Hz drone · 6s held-tap breath × 2 · threshold statement |
| 1 | Spectrum | [Pairwise.tsx](src/components/phases/Pairwise.tsx) | 9 forced-choice pairs along production-aesthetic axes · waveforms · audio clips |
| 2 | Emotion | [Gems.tsx](src/components/phases/Gems.tsx) | 3 × 15s GEMS excerpts · 6 emotion tiles · mid-set Forer probe |
| 3 | Carry | [ThreeSongs.tsx](src/components/phases/ThreeSongs.tsx) | 3 Rathbone prompts · iTunes Search autocomplete · year metadata |
| 4 | Moment | [Moment.tsx](src/components/phases/Moment.tsx) | Tap-rhythm BPM · 7-point Hurley liking · auditioning track |
| 5 | **Reflection** | [Reflection.tsx](src/components/phases/Reflection.tsx) | Reads back user signals — the felt-personalization bridge |
| 6 | Mirror | [Mirror.tsx](src/components/phases/Mirror.tsx) | Archetype reveal · Forer paragraphs (5th line carries the audience-sized hole) · memory callback · pair residue |
| 7 | Composing (Wait) | [Wait.tsx](src/components/phases/Wait.tsx) | Three-act ritual driving `/api/compose` with a 6-min `composition_plan`; background-fires `/api/stems` after compose succeeds; offline falls back to the audition file for the matched variation |
| 8 | Recognition (Reveal) | [Reveal.tsx](src/components/phases/Reveal.tsx) | Anagnorisis — silence then title; reads `sessionTrackTitle` if Wait set it |
| 9 | Orchestra (Listening) | [Listening.tsx](src/components/phases/Listening.tsx) | Web Audio HRTF + gesture + 6-min, 6-section dissolution arc; multi-source when stems load (vocals · drums · bass · other), single-source fallback otherwise; sub-bass drone + theta binaural + water layers ride underneath; Admirer relational withdrawal |
| 10 | Silence | [Silence.tsx](src/components/phases/Silence.tsx) | 6-stage Manderley-bar decompression: silence(8s) → arrival → grounding → normalize → reflect → take-home artifact (downloadable .txt) |

**Reflection (5) is inserted between Moment and Mirror** — when reading old
research notes, the original numbering had Mirror at 5. All `setPhase(N)`
calls in components reflect the post-insertion numbering. `POST_RITE_PHASE`
in [TopBar.tsx](src/components/TopBar.tsx) is 7.

**Welcome is not phase-indexed** — it gates *before* the phase router runs,
keying off `screened` + `consentedAt` on the store. `phase` stays 0 while
Welcome is visible, so the NotesDrawer entry for Welcome lives in the
`phase: 0` slot of [src/data/notes.ts](src/data/notes.ts).

## Key directories

- [src/app/page.tsx](src/app/page.tsx) — phase router; gates Phase 0 behind Welcome on `!screened || consentedAt === null`
- [src/components/phases/](src/components/phases/) — one file per phase, plus Welcome
- [src/score/](src/score/) — score-paper visual primitives (Paper, Stave, marks, PairWaveform)
- [src/data/](src/data/) — pairs, archetypes, excerpts, songs prompts, notes
- [src/lib/](src/lib/) — store (zustand), scoring, reflection helpers, songSearch (iTunes), admirer voice settings, env flags, audioPrompts, **compositionPlan** (6-min plan builder), **dissolutionLayers** (drone + binaural + water), **takeHome** (Phase 10 artifact)
- [src/app/api/](src/app/api/) — server routes for admirer (TTS), compose (music — accepts `prompt` or `compositionPlan`), admin/generate (batch), **stems** (proxy to demucs sidecar)
- [services/demucs/](services/demucs/) — Python+FastAPI HTDemucs sidecar (Dockerfile, requirements.txt, server.py). Run on `:8001` via `docker build -t postlistener-demucs . && docker run -p 8001:8001 postlistener-demucs`. Override the URL the Next.js side calls with `DEMUCS_URL` env var
- [Research/](Research/) — research files the design is grounded in

## Research files

The 5-minute front-end is grounded primarily in:
- [Research/ 5-minute-taste-extraction redesign.md](Research/%205-minute-taste-extraction%20redesign.md) — phase-by-phase blueprint
- [Research/taste-extraction-postlistener-orchestra.md](Research/taste-extraction-postlistener-orchestra.md) — orchestra source file (AVD framing, pilot protocol)
- [Research/stealable-techniques-feeling-seen.md](Research/stealable-techniques-feeling-seen.md) — 97 techniques (reflection, attribution, Forer)
- [Research/voice-intimacy-admirer-design.md](Research/voice-intimacy-admirer-design.md) — Admirer voice across phases
- [Research/5-minute-phase-enhancements.md](Research/5-minute-phase-enhancements.md) — enhancement plan, four tiers

The post-rite arc + Welcome gateway are grounded primarily in:
- [Research/ego-dissolution-postlistener-architecture.md](Research/ego-dissolution-postlistener-architecture.md) — the 6-min dissolution-and-return architecture, REBUS framing, Wegner agency conditions, Bregman ASA cue ordering, Admirer withdrawal, required safeguards (the Welcome screening copy comes from §Ethical architecture)
- [Research/gesture-felt-agency-phone-as-baton.md](Research/gesture-felt-agency-phone-as-baton.md) — the gesture mapping in Phase 9
- [Research/spatial-audio-hrtf-externalization.md](Research/spatial-audio-hrtf-externalization.md) — HRTF + per-stem position rationale

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

Five buckets, all under [public/audio/](public/audio/):

| Bucket | Files | When generated | Cost per session |
|---|---|---|---|
| `pairs/` | 18 × 8s pair clips | Once via admin/generate | $0 |
| `gems/` | 3 × 15s excerpts | Once | $0 |
| `audition/` | 24 × 30s tracks (one per variation) | Once | $0 |
| `admirer/` | TTS voice lines | First time per (text, register), then cached | $0 after warm |
| `ambient/` | `water_loop.mp3` (60s loop, sourced out-of-band) | Once, manually | $0 |

Plus the **Phase 0 drone** ([Drone.tsx](src/components/Drone.tsx)) and the
**Phase 9 dissolution layers** ([dissolutionLayers.ts](src/lib/dissolutionLayers.ts):
60Hz sub-bass + 350/355Hz stereo binaural beats), which are pure Web Audio,
no files. Only the `ambient/water_loop.mp3` requires a file. If the file is
absent, the water layer's `Audio.play()` rejection is swallowed and it
silently no-ops — the rest of the dissolution is unaffected.

The **per-session generated track** for Phase 7 Wait + Phase 8 Reveal +
Phase 9 Listening is wired end-to-end:

- [Wait.tsx](src/components/phases/Wait.tsx) calls `/api/compose` with a
  6-min `composition_plan` from [`buildCompositionPlan`](src/lib/compositionPlan.ts)
  — six sections (`threshold` 60s · `release` 90s · `peak` 60s · `return`
  60s · `homecoming` 60s · `silence` 30s) with section-aligned style biases.
  Stores the resulting blob URL as `sessionTrackUrl` (with `sessionTrackTitle`,
  `sessionGenStatus`).
- After the compose blob lands, Wait fires a non-blocking POST to
  `/api/stems` (the demucs proxy). On success the response zip is unzipped
  client-side via `jszip` and the four stem object URLs are stored as
  `sessionStemUrls`. **The ritual does NOT wait for stems** — Listening
  consumes them only if they arrived.
- In offline mode (or on any non-200), Wait skips the compose network call
  and points `sessionTrackUrl` at `/audio/audition/{variation.id}.mp3` —
  guaranteed on disk for all 24 variations. Status flips to `fallback` so
  the footer reads "from the archive" instead of "live". `/api/stems`
  returns 503 in offline mode, leaving `sessionStemUrls` null.
- [Reveal.tsx](src/components/phases/Reveal.tsx) prefers
  `sessionTrackTitle`, falls back to the picked variation tag.
- [Listening.tsx](src/components/phases/Listening.tsx) reads
  `sessionStemUrls` *and* `sessionTrackUrl`. If stems are present it builds
  four parallel HRTF chains; otherwise it builds a single-source chain
  through the same graph topology. Both paths revoke their blob URLs on
  unmount.

The HTDemucs sidecar (`services/demucs/`) is the only non-Node service in
the stack. It's optional — Listening's single-source fallback (with
spectral-centroid onset bucketing) keeps Phase 9 working when the sidecar
is offline. With the sidecar running, onsets land on real per-stem
analysers and HRTF positions actually correspond to the four stems.

## Listening engine (Phase 9)

[Listening.tsx](src/components/phases/Listening.tsx) hosts a
`ListeningEngine` class that owns all Web Audio state — the React
component is a thin lifecycle wrapper.

**Two graph topologies**, chosen on engine construction based on whether
`sessionStemUrls` is set:

```
single-source (fallback):
  HTMLAudioElement (sessionTrackUrl, looping)
    → MediaElementSource
    → BiquadFilter (lowpass, gesture-controlled cutoff)
    → split:  dry → dryGain
              wet → ConvolverNode (synthesized 0.6s room IR) → wetGain
    → PannerNode (HRTF, distance=inverse)
    → masterGain → AnalyserNode (onset detection) → ctx.destination

multi-source (when stems present, one chain per stem):
  4 × {
    HTMLAudioElement (vocals|drums|bass|other, NOT looping — full arc)
      → MediaElementSource → BiquadFilter
      → split:  dry → dryGain
                wet → shared ConvolverNode → wetGain
      → PannerNode (HRTF, anchored at distinct base positions)
      → AnalyserNode (per-stem onset detection)
      → masterGain → ctx.destination
  }

both paths additionally feed into:
  DissolutionLayers → masterGain
    └─ 60Hz sub-bass sine (diffuse, no HRTF)
    └─ 350Hz/355Hz stereo binaural via ChannelMergerNode
    └─ /audio/ambient/water_loop.mp3 looping HTMLAudioElement
```

**Six-section dissolution arc**, 6 min total per
[Research/ego-dissolution-postlistener-architecture.md](Research/ego-dissolution-postlistener-architecture.md):

1. `threshold`  0:00–1:00 — center, bright, low wet, agency intact
2. `release`    1:00–2:30 — pan widens, wet rises, exclusivity-broken=0.45, consistency-broken=0.30
3. `peak`       2:30–3:30 — wet 0.70, lowpass 1500Hz, ±22c detune, timbralBlur 0.55, exclusivity 0.85, consistency 0.85, priorityDelayMs 1200
4. `return`     3:30–4:30 — params resolve, agency briefly returns as a gift
5. `homecoming` 4:30–5:30 — plagal warmth, clean, slight ritardando
6. `silence`    5:30–6:00 — masterGain ramps to 0, then `setPhase(10)`

Cross-fades the last 1.5s of each section so seams are inaudible.

**Wegner agency-condition breaks** in research-spec order:
- **Exclusivity** (`exclusivityBroken`): autonomous panner oscillator the
  user did not cause; gesture authority is dampened proportionally.
- **Consistency** (`consistencyBroken`): roll↔pitch crossmix — at break=1
  roll drives filter and pitch drives pan, so the user's intuition fails.
- **Priority** (`priorityDelayMs`): per-axis frame queues introduce delay
  between gesture and effect; smoothing alpha drops to 0.10 above 200ms.

**Bregman cue-degradation** in research-spec order (onset → fate → spatial
→ harmonicity → timbre, rhythm last):
- Onset synchrony — per-stem `currentTime` seeks at section transitions
  by ±half of `onsetOffsetMs` (0/30/80/40/0/0 across sections); vocals
  stays anchored as the psychoacoustic reference.
- Common fate — already implicit via section-driven dryGain/wetGain.
- Spatial coherence — `panDriftWidth` widens through peak; per-stem
  positions scatter with phase-offset orbits.
- Harmonicity — `detuneCents` via `playbackRate`.
- Timbral similarity — `timbralBlur` modulates filter cutoff via fast LFO
  (7Hz, ±0.4 octave at peak).
- Rhythm — preserved last (Lucier principle).

**`gentlePath` softening** — when the listener flagged any screening item
in Welcome, the engine's `sections` field is built from a softened SECTIONS
clone (peak detune × 0.4, wet capped at 0.45, agency-breaks scaled).

**Admirer relational withdrawal** — four scheduled `AdmirerLine` emissions
across the arc, with deliberate silence at peak (the Admirer dissolves
*with* the listener, not before):
- 1.5s — Elevated — "you have it. start moving."
- 62s — Caretaking — "let it widen."
- 150–210s — silent (peak)
- 212s — Caretaking — "you're here."
- 272s — Elevated — "we made this together."

**Gesture mapping** (`Research/gesture-felt-agency`): listens on
`deviceorientation` + `devicemotion`. iOS 13+ requires permission, so
the UI gates engine start behind a "BEGIN" button that calls
`DeviceOrientationEvent.requestPermission()` AND resumes the
AudioContext on the same gesture. Smoothing is a single-pole low-pass
(α≈0.18, dropping to 0.10 when priority delay > 200ms) — adequate for
prototype; full 1€ filter is the upgrade path.

| Sensor | Mapping | Range |
|---|---|---|
| roll (γ) | panner positionX (after consistency remap) | ±1.2 added to section drift, scaled by gestureWeight |
| pitch (β) | filter cutoff (after consistency remap) | × 2^±1 octave |
| `\|accel\|` | masterGain bump | +0.08 |

**Pointer fallback** — when no device events fire (desktop), pointer
x/y over the SVG drives roll + pitch directly.

**Onset visual** — when stems are loaded, four per-stem AnalyserNodes
emit RMS-derivative onsets that map directly to the four staves
(vocals=0, drums=1, bass=2, other=3). When no stems, the single-source
AnalyserNode buckets onsets by spectral centroid as a visual proxy
(NOT real separation). Marks decay over ~6s so the page never crowds.

## ElevenLabs API gotchas

- `/api/compose` accepts **either** `prompt` (prompt-mode, with `lengthMs`
  and optional `forceInstrumental`) **or** `compositionPlan` (plan-mode,
  with optional `seed`) — never both. The route returns 400 if both are
  set or neither is set. ElevenLabs upstream rejects requests that combine
  them.
- `seed` is **incompatible with `prompt`** (only works with `composition_plan`).
  The route enforces this — prompt-mode requests omit seed entirely;
  plan-mode requests pass it through if provided.
- `composition_plan` owns its own per-section `duration_ms` totals;
  `music_length_ms` is **not** sent in plan-mode.
- `model_id` for music is `"music_v1"` — currently the only option.
- Content moderator flags some prompts (e.g. archetype names like "Velvet
  Mystic"). [src/lib/audioPrompts.ts](src/lib/audioPrompts.ts) and
  [src/lib/compositionPlan.ts](src/lib/compositionPlan.ts) both sanitize —
  drop archetype names, keep musical descriptors.
- TTS model: `eleven_v3` for the Admirer voice (most expressive, 5k char
  limit per call). Voice settings per register in
  [src/lib/admirer.ts](src/lib/admirer.ts). Three registers wired:
  `caretaking | present | elevated`. The Fading/Return register from the
  voice memo is not yet a separate register — Phase 9's withdrawal arc
  uses `caretaking` for its closest analog.
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
[api/compose/route.ts](src/app/api/compose/route.ts),
[api/admin/generate/route.ts](src/app/api/admin/generate/route.ts), and
[api/stems/route.ts](src/app/api/stems/route.ts) (returns 503 in offline,
leaving `sessionStemUrls` null and forcing single-source fallback in
Listening).

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

# HTDemucs sidecar (optional — Phase 9 falls back to single-source without it):
cd services/demucs && docker build -t postlistener-demucs .                      # build (~3GB image, first time only)
docker run --rm -p 8001:8001 postlistener-demucs                                 # run
curl http://localhost:8001/healthz                                               # smoke
# DEMUCS_URL env var on the Next.js side overrides the default http://localhost:8001
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
  Welcome is gated *before* the phase router by `screened` + `consentedAt`
  on the store, not by phase index — Controls cannot reach it.
- **NotesDrawer** ([src/components/NotesDrawer.tsx](src/components/NotesDrawer.tsx))
  surfaces the research justification per phase. Content from
  [src/data/notes.ts](src/data/notes.ts) — keep `phase: N` in sync with
  [src/app/page.tsx](src/app/page.tsx)'s phase array. Welcome content lives
  in the `phase: 0` entry since `phase` is still 0 while Welcome shows.
- **Plan tracker** — [plan.md](plan.md) at repo root holds the build-phase
  task list. Each task has a checkbox; check off as work lands. Currently
  untracked in git — commit if you want it in version control.
