// While-away world simulation (ENGINE_SPEC §4) — the retention core.
// When the app opens, deterministically compute what each monster "did" on each
// calendar day since the last open. Pure: same (monster, lastOpen, now) -> same
// events. No server, no push payload content; everything is recomputed on open.

import { DISCOVERIES_BY_CATEGORY, DISCOVERIES_COMMON } from '../data/vocab';
import { dayOrdinal, makeRng, mixSeed, stableHash } from './seed';
import type { Attributes, DexCard, DiscoveryEntry } from './types';

const ADVENTURE_PROBABILITY = 0.55; // chance a monster has a discovery on a given day
const MAX_DAYS = 60; // never simulate more than this many days of backlog

function dateLabel(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fill(tpl: string, card: DexCard, color: string): string {
  return tpl
    .replace(/%FOOD%/g, card.stats.favorite)
    .replace(/%CRY%/g, card.stats.cry)
    .replace(/%COLOR%/g, color);
}

export interface WhileAwayResult {
  newEntries: DiscoveryEntry[]; // to append to monster.log
  summary: DiscoveryEntry | null; // most recent, for the welcome/return card
}

export function whileAwayEvents(params: {
  monsterId: string;
  seed: number;
  attributes: Attributes;
  card: DexCard;
  lastOpenMs: number;
  nowMs: number;
}): WhileAwayResult {
  const { monsterId, seed, attributes, card, lastOpenMs, nowMs } = params;
  const baseSeed = stableHash('away:' + monsterId + ':' + seed);

  const startDay = dayOrdinal(lastOpenMs);
  const endDay = dayOrdinal(nowMs);
  const firstDay = Math.max(startDay + 1, endDay - MAX_DAYS + 1);

  const pool = [...DISCOVERIES_COMMON, ...(DISCOVERIES_BY_CATEGORY[attributes.category] ?? [])];
  const color = attributes.colors[0] ?? 'にじいろ';

  const newEntries: DiscoveryEntry[] = [];
  for (let day = firstDay; day <= endDay; day++) {
    const rng = makeRng(mixSeed(baseSeed, day));
    if (!rng.chance(ADVENTURE_PROBABILITY)) continue;
    const tpl = rng.pick(pool);
    const dayMs = day * 86_400_000;
    newEntries.push({ dayOrdinal: day, dateLabel: dateLabel(dayMs), text: fill(tpl, card, color) });
  }

  return {
    newEntries,
    summary: newEntries.length ? newEntries[newEntries.length - 1] : null,
  };
}

// Seed the very first log entry at intake ("はじめて みつかった").
export function firstDiscovery(card: DexCard, createdAtMs: number): DiscoveryEntry {
  const day = dayOrdinal(createdAtMs);
  const zoneShort = card.zone.replace(' ぞく', '');
  return {
    dayOrdinal: day,
    dateLabel: dateLabel(createdAtMs),
    text: `${zoneShort}で はじめて みつかった`,
  };
}
