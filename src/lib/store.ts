import { create } from 'zustand';
import type { Side } from '@/types';
import { PAIRS } from '@/data/pairs';
import { EXCERPTS } from '@/data/excerpts';

export interface AppState {
  phase: number;
  startTime: number | null;

  // phase 1
  currentPair: number;
  pairChoices: (Side | undefined)[];
  pairLatencies: (number | undefined)[];
  /** Side the user hovered but did NOT commit — Stillman 2018 conflict marker. */
  pairAlmosts: (Side | undefined)[];

  // phase 2
  currentExcerpt: number;
  emotionTiles: string[][];

  // phase 3
  songs: [string, string, string];
  /** Release years parallel to `songs`, populated by autocomplete pick. */
  songYears: (number | null)[];
  songIndex: number;

  // phase 4
  tapTimes: number[];
  tapBPM: number | null;
  likingValue: number | null;

  // phase 7+ — per-session generated track
  /** Object URL (live generation) or static path (offline/fallback). */
  sessionTrackUrl: string | null;
  /** Title shown at Reveal — variation tag for now, real model title later. */
  sessionTrackTitle: string | null;
  /** Generation pipeline state, surfaced by Wait/Reveal/Listening. */
  sessionGenStatus: 'idle' | 'composing' | 'ready' | 'fallback' | 'error';

  // actions
  setPhase: (phase: number) => void;
  recordPairChoice: (index: number, side: Side, latency: number) => void;
  recordPairAlmost: (index: number, side: Side) => void;
  nextPair: () => void;
  toggleEmotionTile: (excerptIndex: number, tile: string) => void;
  nextExcerpt: () => void;
  setSong: (index: number, value: string, year?: number | null) => void;
  nextSong: () => void;
  /** Phase 0: first-name address used by Threshold + Mirror. */
  userName: string;
  setUserName: (name: string) => void;
  pushTap: (time: number) => void;
  setBPM: (bpm: number) => void;
  setLiking: (value: number) => void;
  ensureStartTime: () => void;
  setSessionTrack: (
    url: string | null,
    title: string | null,
    status: AppState['sessionGenStatus']
  ) => void;
  reset: () => void;
}

const initialState = {
  phase: 0,
  startTime: null,
  currentPair: 0,
  pairChoices: Array(PAIRS.length).fill(undefined) as (Side | undefined)[],
  pairLatencies: Array(PAIRS.length).fill(undefined) as (number | undefined)[],
  pairAlmosts: Array(PAIRS.length).fill(undefined) as (Side | undefined)[],
  currentExcerpt: 0,
  emotionTiles: EXCERPTS.map(() => [] as string[]),
  songs: ['', '', ''] as [string, string, string],
  songYears: [null, null, null] as (number | null)[],
  songIndex: 0,
  tapTimes: [] as number[],
  tapBPM: null,
  likingValue: null,
  userName: '',
  sessionTrackUrl: null as string | null,
  sessionTrackTitle: null as string | null,
  sessionGenStatus: 'idle' as AppState['sessionGenStatus'],
};

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  recordPairChoice: (index, side, latency) =>
    set((s) => {
      const pairChoices = [...s.pairChoices];
      const pairLatencies = [...s.pairLatencies];
      pairChoices[index] = side;
      pairLatencies[index] = latency;
      return { pairChoices, pairLatencies };
    }),

  recordPairAlmost: (index, side) =>
    set((s) => {
      const pairAlmosts = [...s.pairAlmosts];
      pairAlmosts[index] = side;
      return { pairAlmosts };
    }),

  nextPair: () =>
    set((s) => {
      if (s.currentPair < PAIRS.length - 1) {
        return { currentPair: s.currentPair + 1 };
      }
      return { phase: 2 };
    }),

  toggleEmotionTile: (excerptIndex, tile) =>
    set((s) => {
      const emotionTiles = s.emotionTiles.map((arr) => [...arr]);
      const list = emotionTiles[excerptIndex];
      const i = list.indexOf(tile);
      if (i >= 0) list.splice(i, 1);
      else list.push(tile);
      return { emotionTiles };
    }),

  nextExcerpt: () =>
    set((s) => {
      if (s.currentExcerpt < EXCERPTS.length - 1) {
        return { currentExcerpt: s.currentExcerpt + 1 };
      }
      return { phase: 3 };
    }),

  setSong: (index, value, year = null) =>
    set((s) => {
      const songs = [...s.songs] as [string, string, string];
      const songYears = [...s.songYears];
      songs[index] = value;
      songYears[index] = year ?? null;
      return { songs, songYears };
    }),

  setUserName: (name) => set({ userName: name }),

  nextSong: () =>
    set((s) => {
      if (s.songIndex < 2) return { songIndex: s.songIndex + 1 };
      return { phase: 4 };
    }),

  pushTap: (time) =>
    set((s) => {
      const tapTimes = [...s.tapTimes, time];
      if (tapTimes.length > 6) tapTimes.shift();
      return { tapTimes };
    }),

  setBPM: (bpm) => set({ tapBPM: bpm }),

  setLiking: (value) => set({ likingValue: value }),

  ensureStartTime: () =>
    set((s) => (s.startTime ? {} : { startTime: Date.now() })),

  setSessionTrack: (url, title, status) =>
    set({ sessionTrackUrl: url, sessionTrackTitle: title, sessionGenStatus: status }),

  reset: () =>
    set(() => ({
      ...initialState,
      pairChoices: Array(PAIRS.length).fill(undefined),
      pairLatencies: Array(PAIRS.length).fill(undefined),
      pairAlmosts: Array(PAIRS.length).fill(undefined),
      emotionTiles: EXCERPTS.map(() => []),
      songs: ['', '', ''],
      songYears: [null, null, null],
      tapTimes: [],
      startTime: Date.now(),
      userName: '',
      sessionTrackUrl: null,
      sessionTrackTitle: null,
      sessionGenStatus: 'idle',
    })),
}));
