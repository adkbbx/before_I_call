// The night's progress: 100 candles, scenes read, ghost words collected. Pure functions plus guarded storage.
import { levels, type Level } from './schema.ts';

export const TOTAL_CANDLES = 100;
export const DEMO_START_OUT = 99;
export const MAX_GHOSTS = 500;
const STORAGE_KEYS = { real: 'aoandon.night.v1', demo: 'aoandon.demo-night.v1' } as const;

export type GhostWord = {
  word: string;
  reading?: string;
  gloss?: string;
  source: 'jlpt' | 'model' | 'story';
  sentence: string;
  taleId: string;
};

export type NightState = {
  version: 1;
  demo: boolean;
  level: Level;
  out: number;
  done: string[];
  ghosts: GhostWord[];
};

export function initialNight(level: Level = 'N4', demo = false): NightState {
  return { version: 1, demo, level, out: demo ? DEMO_START_OUT : 0, done: [], ghosts: [] };
}

export function sceneKey(taleId: string, sceneId: string, level: Level): string {
  return `${taleId}/${sceneId}/${level}`;
}

export function litCandles(state: NightState): number {
  return TOTAL_CANDLES - state.out;
}

export function isRevealed(state: NightState): boolean {
  return state.out >= TOTAL_CANDLES;
}

/** Puts out one candle for a finished scene. Reading the same scene at the same level twice does not count twice. */
export function blowOut(state: NightState, key: string): NightState {
  if (state.done.includes(key) || isRevealed(state)) return state;
  return { ...state, out: Math.min(TOTAL_CANDLES, state.out + 1), done: [...state.done, key] };
}

export function addGhost(state: NightState, ghost: GhostWord): NightState {
  if (state.ghosts.some(item => item.word === ghost.word)) return state;
  return { ...state, ghosts: [...state.ghosts, ghost].slice(-MAX_GHOSTS) };
}

export function removeGhost(state: NightState, word: string): NightState {
  return { ...state, ghosts: state.ghosts.filter(item => item.word !== word) };
}

export function setLevel(state: NightState, level: Level): NightState {
  return { ...state, level };
}

/** DESIGN.md Motion: room brightness = 0.35 + 0.65 * lit^0.7, where lit is 0..1. */
export function roomBrightness(lit: number): number {
  const clamped = Math.min(1, Math.max(0, lit));
  return 0.35 + 0.65 * Math.pow(clamped, 0.7);
}

/** DESIGN.md Motion: lantern intensity grows as the room darkens. */
export function lanternIntensity(lit: number): number {
  const clamped = Math.min(1, Math.max(0, lit));
  return 0.55 + 0.45 * (1 - clamped);
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function isNightState(value: unknown): value is NightState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return (
    state.version === 1 &&
    typeof state.demo === 'boolean' &&
    typeof state.level === 'string' &&
    (levels as readonly string[]).includes(state.level) &&
    typeof state.out === 'number' &&
    Number.isInteger(state.out) &&
    state.out >= 0 &&
    state.out <= TOTAL_CANDLES &&
    Array.isArray(state.done) &&
    state.done.every(item => typeof item === 'string') &&
    Array.isArray(state.ghosts) &&
    state.ghosts.every(item => item && typeof item === 'object' && typeof (item as GhostWord).word === 'string')
  );
}

/** Loads the real or demo night. Broken, missing or blocked storage gives a fresh night. */
export function loadNight(demo: boolean, storage: StorageLike | undefined = defaultStorage()): NightState {
  try {
    const raw = storage?.getItem(demo ? STORAGE_KEYS.demo : STORAGE_KEYS.real);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isNightState(parsed) && parsed.demo === demo) return parsed;
    }
  } catch {
    // Fall through to a fresh night; the app must work without storage.
  }
  return initialNight('N4', demo);
}

export function saveNight(state: NightState, storage: StorageLike | undefined = defaultStorage()): boolean {
  try {
    storage?.setItem(state.demo ? STORAGE_KEYS.demo : STORAGE_KEYS.real, JSON.stringify(state));
    return Boolean(storage);
  } catch {
    return false;
  }
}
