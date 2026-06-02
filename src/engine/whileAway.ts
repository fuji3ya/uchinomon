// While-away world simulation (ENGINE_SPEC §4) — the retention core.
// Pure: same (monster, lastOpen, now, siblingNames) -> same events. No server,
// no Date.now/Math.random. Independent seed streams per concern so arc detection
// (Task 6) is window-independent.

import {
  ARCS, ATE_TEMPLATES, DISCOVERIES_BY_CATEGORY, DISCOVERIES_COMMON, FRIEND_TEMPLATES,
  ITEMS, ITEM_RARITY_WEIGHT, KIND_WEIGHTS, NAP_TEMPLATES, WEATHER_TEMPLATES,
} from '../data/vocab';
import type { Arc } from '../data/vocab';
import { dayOrdinal, makeRng, mixSeed, stableHash } from './seed';
import { weatherForDay } from './weather';
import type { Attributes, DexCard, DiscoveryEntry, DiscoveryKind, Item } from './types';

const ADVENTURE_PROBABILITY = 0.55;
const MAX_DAYS = 60;

function dateLabel(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 各概念ごとに独立した RNG（day を salt 違いで混ぜる）。
function rngFor(baseSeed: number, salt: string, day: number) {
  return makeRng(stableHash(`${salt}:${baseSeed}:${day}`));
}

function adventureHappened(baseSeed: number, day: number): boolean {
  return rngFor(baseSeed, 'adv', day).chance(ADVENTURE_PROBABILITY);
}

// ── mini-story arcs (window-independent, pure function of (baseSeed, day)) ──
const ARC_START_PROBABILITY = 0.12; // among adventure days
const ARC_LOOKBACK = ARCS.reduce((m, a) => Math.max(m, a.days.length), 0); // >= longest arc

function arcAt(baseSeed: number, startDay: number): Arc {
  return ARCS[rngFor(baseSeed, 'arcpick', startDay).int(ARCS.length)];
}

// raw start: an adventure day that also rolls an arc start (no overlap check).
function isRawArcStart(baseSeed: number, day: number): boolean {
  if (!adventureHappened(baseSeed, day)) return false;
  return rngFor(baseSeed, 'arcstart', day).chance(ARC_START_PROBABILITY);
}

// effective start: a raw start not already covered by an earlier raw start within lookback.
function isEffectiveArcStart(baseSeed: number, day: number): boolean {
  if (!isRawArcStart(baseSeed, day)) return false;
  for (let k = 1; k <= ARC_LOOKBACK - 1; k++) {
    const s = day - k;
    if (isRawArcStart(baseSeed, s) && day - s < arcAt(baseSeed, s).days.length) return false;
  }
  return true;
}

// If `day` is inside an effective arc, return its arc + offset; else null.
function arcCover(baseSeed: number, day: number): { arc: Arc; offset: number } | null {
  for (let s = day - (ARC_LOOKBACK - 1); s <= day; s++) {
    if (isEffectiveArcStart(baseSeed, s)) {
      const arc = arcAt(baseSeed, s);
      const offset = day - s;
      if (offset >= 0 && offset < arc.days.length) return { arc, offset };
    }
  }
  return null;
}

// test hook (does not affect production behavior)
export function __arcCoverForTest(baseSeed: number, day: number) {
  return arcCover(baseSeed, day);
}

// 重み付き抽選。entries: [key, weight][]。
function weightedPick<T extends string>(rng: ReturnType<typeof makeRng>, entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return k;
  }
  return entries[entries.length - 1][0];
}

function pickItem(rng: ReturnType<typeof makeRng>): Item {
  const weighted = ITEMS.map((it) => [it.id, ITEM_RARITY_WEIGHT[it.rarity]] as [string, number]);
  const id = weightedPick(rng, weighted);
  return ITEMS.find((it) => it.id === id) ?? ITEMS[0];
}

function weatherBucket(day: number): 'snow' | 'rain' | 'rainbow' | 'festival' | 'fair' {
  const w = weatherForDay(day * 86_400_000);
  if (w === 'snow' || w === 'rain' || w === 'rainbow' || w === 'festival') return w;
  return 'fair';
}

function pickKind(baseSeed: number, day: number, hasSibling: boolean): DiscoveryKind {
  const entries = (Object.entries(KIND_WEIGHTS) as [DiscoveryKind, number][])
    .filter(([k]) => hasSibling || k !== 'なかよし');
  return weightedPick(rngFor(baseSeed, 'kind', day), entries);
}

function renderEntry(
  baseSeed: number, day: number, kind: DiscoveryKind,
  card: DexCard, attributes: Attributes, siblingNames: string[],
): { text: string; itemId?: string } {
  const rng = rngFor(baseSeed, 'text', day);
  const color = attributes.colors[0] ?? 'にじいろ';
  switch (kind) {
    case 'たべた':
      return { text: rng.pick(ATE_TEMPLATES).replace(/%FOOD%/g, card.stats.favorite) };
    case 'ひるね':
      return { text: rng.pick(NAP_TEMPLATES) };
    case 'てんき':
      return { text: rng.pick(WEATHER_TEMPLATES[weatherBucket(day)]) };
    case 'なかよし': {
      const friend = rng.pick(siblingNames);
      return { text: rng.pick(FRIEND_TEMPLATES).replace(/%FRIEND%/g, friend) };
    }
    case 'おみやげ': {
      const item = pickItem(rng);
      return { text: `${item.name}を ひろって かえってきた`, itemId: item.id };
    }
    case 'ぼうけん':
    default: {
      const pool = [...DISCOVERIES_COMMON, ...(DISCOVERIES_BY_CATEGORY[attributes.category] ?? [])];
      return { text: rng.pick(pool).replace(/%COLOR%/g, color).replace(/%CRY%/g, card.stats.cry).replace(/%FOOD%/g, card.stats.favorite) };
    }
  }
}

export interface WhileAwayResult {
  newEntries: DiscoveryEntry[];
  summary: DiscoveryEntry | null;
}

export function whileAwayEvents(params: {
  monsterId: string;
  seed: number;
  attributes: Attributes;
  card: DexCard;
  lastOpenMs: number;
  nowMs: number;
  siblingNames: string[];
}): WhileAwayResult {
  const { monsterId, seed, attributes, card, lastOpenMs, nowMs, siblingNames } = params;
  const baseSeed = stableHash('away:' + monsterId + ':' + seed);
  const hasSibling = siblingNames.length > 0;

  const startDay = dayOrdinal(lastOpenMs);
  const endDay = dayOrdinal(nowMs);
  const firstDay = Math.max(startDay + 1, endDay - MAX_DAYS + 1);

  const newEntries: DiscoveryEntry[] = [];
  let completion: DiscoveryEntry | null = null; // most recent arc-completion, promoted to summary
  for (let day = firstDay; day <= endDay; day++) {
    const cover = arcCover(baseSeed, day);
    if (cover) {
      // arc days are sequential adventure-flavored entries (no double emit on the start day)
      const text = cover.arc.days[cover.offset];
      const entry: DiscoveryEntry = { dayOrdinal: day, dateLabel: dateLabel(day * 86_400_000), text, kind: 'ぼうけん' };
      newEntries.push(entry);
      if (cover.offset === cover.arc.days.length - 1) completion = entry; // arc finished today
      continue;
    }
    if (!adventureHappened(baseSeed, day)) continue;
    const kind = pickKind(baseSeed, day, hasSibling);
    const { text, itemId } = renderEntry(baseSeed, day, kind, card, attributes, siblingNames);
    newEntries.push({ dayOrdinal: day, dateLabel: dateLabel(day * 86_400_000), text, kind, itemId });
  }

  // Prefer an arc completion as the "おかえり" headline; else the most recent event.
  const summary = completion ?? (newEntries.length ? newEntries[newEntries.length - 1] : null);
  return { newEntries, summary };
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
