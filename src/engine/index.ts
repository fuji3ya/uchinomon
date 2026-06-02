// うちのモン on-device world engine — public surface.
// Pure, deterministic, offline. No network, no LLM (ENGINE_SPEC).

export * from './types';
export { stableHash, makeRng } from './seed';
export { deriveAttributes, buildDexCard, mapHexToColorWords } from './dex';
export { weatherForDay, timeOfDay, WEATHER_ASSET, WEATHER_LABEL } from './weather';
export { whileAwayEvents, firstDiscovery } from './whileAway';
export { deriveItems, itemCount } from './items';
export { deriveBond, welcomeLineFor } from './bond';

import { buildDexCard, deriveAttributes } from './dex';
import { stableHash } from './seed';
import type { Attributes, Monster, RenderMode } from './types';
import { firstDiscovery } from './whileAway';

// Create a brand-new Monster at intake from a finished cutout.
export function buildMonster(params: {
  pixelHash: string; // stable hash of the original drawing's pixels
  aspect: number; // bounding-box w/h from the cutout
  number: number; // next dex number
  createdAtMs: number;
  originalUri: string;
  cutUri: string | null;
  renderMode: RenderMode;
  overrideName?: string;
  attributes?: Attributes; // optional: real on-device extraction; else derived
}): Monster {
  const seed = stableHash(`mon:${params.pixelHash}:${params.createdAtMs}`);
  const attributes = params.attributes ?? deriveAttributes(params.pixelHash, params.aspect);
  const card = buildDexCard({
    number: params.number,
    attributes,
    seed,
    createdAtMs: params.createdAtMs,
    overrideName: params.overrideName,
  });
  return {
    id: params.pixelHash,
    seed,
    createdAtMs: params.createdAtMs,
    renderMode: params.renderMode,
    originalUri: params.originalUri,
    cutUri: params.cutUri,
    attributes,
    card,
    log: [firstDiscovery(card, params.createdAtMs)],
  };
}
