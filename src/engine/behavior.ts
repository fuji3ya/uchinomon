// Living-zoo behavior (Phase 2). Deterministic per (seed, calendar day): the
// same monster shows a stable mood for a given day + weather + time-of-day, so
// it does not flip-flop on every re-render. Pure: no Date.now/Math.random here.
import { dayOrdinal, makeRng, mixSeed } from './seed';
import type { TimeOfDay, Weather } from './types';

export type Behavior = 'sleeping' | 'sheltering' | 'playing' | 'roaming';

// Decide how a monster is acting right now. weather + tod come from the device
// clock (computed by the caller); the per-day RNG adds gentle per-monster variety.
export function behaviorFor(seed: number, weather: Weather, tod: TimeOfDay, nowMs: number): Behavior {
  const roll = makeRng(mixSeed(seed, dayOrdinal(nowMs))).next();
  if (weather === 'rain' || weather === 'snow') return roll < 0.8 ? 'sheltering' : 'roaming';
  if (weather === 'rainbow' || weather === 'festival') return 'playing';
  if (tod === 'よる') return roll < 0.7 ? 'sleeping' : 'roaming';
  if (tod === 'あさ') return roll < 0.6 ? 'roaming' : 'playing';
  // ひる / ゆうがた
  return roll < 0.35 ? 'playing' : 'roaming';
}
