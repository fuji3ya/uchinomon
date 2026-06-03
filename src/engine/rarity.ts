// Collectible card rarity (Phase 3). Deterministic per monster seed so a card's
// rarity is stable forever. Pure (no Date.now/Math.random).
import { makeRng, mixSeed } from './seed';
import type { Rarity } from './types';

const RARITY_SALT = 0x7c3a; // keep this draw independent from other seed uses

// Weighted: most cards common, a few rare, rare legend. Stable for a given seed.
export function cardRarity(seed: number): Rarity {
  const roll = makeRng(mixSeed(seed, RARITY_SALT)).next();
  if (roll < 0.08) return 'legend';
  if (roll < 0.33) return 'rare';
  return 'common';
}
