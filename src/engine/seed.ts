// Deterministic seeding + RNG for うちのモン's on-device world engine.
// Pure functions only: same input -> same output (ENGINE_SPEC §3). No Date.now,
// no Math.random — everything derives from an explicit seed so the while-away
// world is reproducible and unit-testable offline.

// FNV-1a 32-bit string hash. Stable across runs/platforms.
export function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: tiny, fast, well-distributed seeded PRNG.
export function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    // float in [0,1)
    next,
    // integer in [0,max)
    int: (max: number): number => Math.floor(next() * max),
    // pick one element deterministically
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    // true with probability p
    chance: (p: number): boolean => next() < p,
    // integer in [min,max] inclusive
    range: (min: number, max: number): number => min + Math.floor(next() * (max - min + 1)),
  };
}

// Combine a base seed with an ordinal (e.g. day number) without collisions.
export function mixSeed(seed: number, ordinal: number): number {
  return stableHash(`${seed >>> 0}:${ordinal | 0}`);
}

// Days (calendar, UTC-stable ordinal) between two epoch-ms timestamps, exclusive
// of the start day, inclusive of subsequent days up to `now`.
export function dayOrdinal(epochMs: number): number {
  return Math.floor(epochMs / 86_400_000);
}
