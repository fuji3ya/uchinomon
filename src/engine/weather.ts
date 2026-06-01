// Deterministic weather + time-of-day (ENGINE_SPEC §5). Uses only the device
// clock + a date seed — no location, no weather API (COPPA: we take no location).
// Maps to the 8 prototype backgrounds (assets/bg-*.png).

import { dayOrdinal, makeRng, mixSeed } from './seed';
import type { TimeOfDay, Weather } from './types';

const GLOBAL_SEED = 0x9e3779b9; // fixed world seed

export function timeOfDay(epochMs: number): TimeOfDay {
  const h = new Date(epochMs).getHours();
  if (h >= 5 && h < 10) return 'あさ';
  if (h >= 10 && h < 16) return 'ひる';
  if (h >= 16 && h < 19) return 'ゆうがた';
  return 'よる';
}

// Weather for a given calendar day. Rainbow is promoted the day AFTER rain;
// festival is a once-a-month world event. Otherwise a weighted draw, then the
// base sky is chosen from the actual time of day.
export function weatherForDay(epochMs: number): Weather {
  const day = dayOrdinal(epochMs);
  const rng = makeRng(mixSeed(GLOBAL_SEED, day));

  // monthly festival: deterministic single day per ~30-day cycle
  const festivalDay = makeRng(mixSeed(GLOBAL_SEED, Math.floor(day / 30))).range(0, 29);
  if (day % 30 === festivalDay) return 'festival';

  // rainbow the day after rain
  const prevRng = makeRng(mixSeed(GLOBAL_SEED, day - 1));
  const prevWasRain = prevRng.next() < 0.18;
  if (prevWasRain && rng.chance(0.6)) return 'rainbow';

  const roll = rng.next();
  if (roll < 0.18) return 'rain';
  if (roll < 0.24) return 'snow';

  // fair weather: sky follows the time of day
  const tod = timeOfDay(epochMs);
  return tod === 'あさ' ? 'morning' : tod === 'ひる' ? 'noon' : tod === 'ゆうがた' ? 'dusk' : 'night';
}

export const WEATHER_ASSET: Record<Weather, string> = {
  morning: 'bg-morning',
  noon: 'bg-noon',
  dusk: 'bg-dusk',
  night: 'bg-night',
  rain: 'bg-rain',
  snow: 'bg-snow',
  rainbow: 'bg-rainbow',
  festival: 'bg-festival',
};

export const WEATHER_LABEL: Record<Weather, string> = {
  morning: 'あさ', noon: 'ひる', dusk: 'ゆうがた', night: 'よる',
  rain: 'あめ', snow: 'ゆき', rainbow: 'にじ', festival: 'おまつり',
};
