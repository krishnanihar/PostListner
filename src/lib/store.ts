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

  // phase 2
  currentExcerpt: number;
  emotionTiles: string[][];

  // phase 3
  songs: [string, string, string];
  songIndex: number;

  // phase 4
  tapTimes: number[];
  tapBPM: number | null;
  likingValue: number | null;

  // actions
  setPhase: (phase: number) => void;
  recordPairChoice: (index: number, side: Side, latency: number) => void;
  nextPair: () => void;
  toggleEmotionTile: (excerptIndex: number, tile: string) => void;
  nextExcerpt: () => void;
  setSong: (index: number, value: string) => void;
  nextSong: () => void;
  pushTap: (time: number) => void;
  setBPM: (bpm: number) => void;
  setLiking: (value: number) => void;
  ensureStartTime: () => void;
  reset: () => void;
}

const initialState = {
  phase: 0,
  startTime: null,
  currentPair: 0,
  pairChoices: Array(PAIRS.length).fill(undefined) as (Side | undefined)[],
  pairLatencies: Array(PAIRS.length).fill(undefined) as (number | undefined)[],
  currentExcerpt: 0,
  emotionTiles: EXCERPTS.map(() => [] as string[]),
  songs: ['', '', ''] as [string, string, string],
  songIndex: 0,
  tapTimes: [] as number[],
  tapBPM: null,
  likingValue: null,
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

  setSong: (index, value) =>
    set((s) => {
      const songs = [...s.songs] as [string, string, string];
      songs[index] = value;
      return { songs };
    }),

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

  reset: () =>
    set(() => ({
      ...initialState,
      pairChoices: Array(PAIRS.length).fill(undefined),
      pairLatencies: Array(PAIRS.length).fill(undefined),
      emotionTiles: EXCERPTS.map(() => []),
      songs: ['', '', ''],
      tapTimes: [],
      startTime: Date.now(),
    })),
}));
