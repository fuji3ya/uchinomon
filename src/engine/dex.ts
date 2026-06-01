// Deterministic dex-card generation (ENGINE_SPEC §2). No LLM, no network.
// Given on-device attributes + a stable seed, produce the full collectible card
// exactly as zukan-card.html consumes it.

import {
  CRIES,
  COLOR_WORDS,
  FOODS,
  KIDS_VOICE_TEMPLATES,
  MONSTER_VOICE_TEMPLATES,
  NAME_PARTS,
  PERSONALITIES,
} from '../data/vocab';
import { makeRng, stableHash } from './seed';
import type { Attributes, Category, DexCard, Diet, SizeClass, Zone } from './types';

const CATEGORIES: Category[] = ['きょうりゅう', 'いきもの', 'とり', 'むし', 'うみのいきもの', 'のりもの', 'ふしぎ'];

const ZONE_BY_CATEGORY: Record<Category, Zone> = {
  きょうりゅう: 'おにわ ぞく',
  いきもの: 'もり ぞく',
  とり: 'そら ぞく',
  むし: 'もり ぞく',
  うみのいきもの: 'みず ぞく',
  のりもの: 'おにわ ぞく',
  ふしぎ: 'よる ぞく',
};

const ZONE_SHORT: Record<Zone, string> = {
  'おにわ ぞく': 'おにわ',
  'もり ぞく': 'もり',
  'みず ぞく': 'みずべ',
  'そら ぞく': 'そら',
  'よる ぞく': 'よるのにわ',
};

const DIET_BY_CATEGORY: Record<Category, Diet> = {
  きょうりゅう: 'しょくぶつ食',
  いきもの: 'なんでも食',
  とり: 'しょくぶつ食',
  むし: 'しょくぶつ食',
  うみのいきもの: 'なんでも食',
  のりもの: 'ひかり食',
  ふしぎ: 'ひかり食',
};

// Deterministic attribute stand-in derived from the drawing's pixel hash + the
// bounding-box aspect ratio measured at cutout time. Real on-device color/shape
// extraction (Core Image / Core ML) replaces the color/category guess later; the
// contract stays the same so nothing downstream changes.
export function deriveAttributes(pixelHash: string, aspect: number): Attributes {
  const rng = makeRng(stableHash('attr:' + pixelHash));
  const category = rng.pick(CATEGORIES);
  const colorCount = rng.range(1, 3);
  const colors: string[] = [];
  while (colors.length < colorCount) {
    const c = rng.pick(COLOR_WORDS);
    if (!colors.includes(c)) colors.push(c);
  }
  const sizeClass: SizeClass = aspect > 1.4 ? 'おおきい' : aspect < 0.7 ? 'ちいさい' : 'ふつう';
  return {
    category,
    colors,
    sizeClass,
    aspect,
    hasHorns: rng.chance(0.4),
    hasLegs: rng.chance(0.7),
  };
}

function nameCandidates(category: Category, rng: ReturnType<typeof makeRng>): string[] {
  const { heads, tails } = NAME_PARTS[category];
  const out = new Set<string>();
  let guard = 0;
  while (out.size < 3 && guard++ < 30) out.add(rng.pick(heads) + rng.pick(tails));
  return [...out];
}

function feature(attr: Attributes, rng: ReturnType<typeof makeRng>): string {
  const parts: string[] = [];
  if (attr.hasHorns) {
    const n = rng.range(2, 7);
    parts.push(`せなかに ${n}つの ${rng.pick(attr.colors)}いろの ツノ`);
  }
  if (parts.length === 0) parts.push(`${attr.colors[0]}いろの まるい からだ`);
  return parts.join('と ');
}

function fill(tpl: string, map: Record<string, string>): string {
  return tpl.replace(/%([A-Z_0-9]+)%/g, (_, k) => map[k] ?? '');
}

export function buildDexCard(params: {
  number: number;
  attributes: Attributes;
  seed: number;
  createdAtMs: number;
  overrideName?: string;
}): DexCard {
  const { number, attributes: attr, seed, createdAtMs, overrideName } = params;
  const rng = makeRng(seed);

  const candidates = nameCandidates(attr.category, rng);
  const name = overrideName?.trim() || candidates[0];

  const personality = rng.pick(PERSONALITIES);
  const favorite = rng.pick(FOODS);
  const cry = rng.pick(CRIES);
  const zone = ZONE_BY_CATEGORY[attr.category];
  const diet = DIET_BY_CATEGORY[attr.category];

  const sizeFactor = attr.sizeClass === 'おおきい' ? 1.8 : attr.sizeClass === 'ちいさい' ? 0.5 : 1;
  const heightM = Math.round((0.2 + rng.next() * 0.6) * sizeFactor * 10) / 10;
  const weightKg = Math.round((0.8 + rng.next() * 2.5) * sizeFactor * 10) / 10;

  const feat = feature(attr, rng);
  const feat2 = attr.hasHorns ? `${rng.pick(attr.colors)}いろの ツノ` : 'まんまるの め';
  const speed = attr.hasLegs ? 'あしが はやく' : 'ふわふわ うかび';

  const slots: Record<string, string> = {
    ZONE: zone,
    ZONE_SHORT: ZONE_SHORT[zone],
    FEATURE: feat,
    FEATURE2: feat2,
    CAT: attr.category,
    SPEED: speed,
    FOOD: favorite,
    CRY: cry,
    COLOR: attr.colors[0],
    PERSONA: personality,
  };

  const monsterVoice = fill(rng.pick(MONSTER_VOICE_TEMPLATES), slots);
  const kidsVoice = fill(rng.pick(KIDS_VOICE_TEMPLATES), slots);

  const d = new Date(createdAtMs);
  const discoveredDateLabel = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} はっけん`;

  return {
    number,
    name,
    nameCandidates: candidates,
    diet,
    zone,
    category: attr.category,
    sizeClass: attr.sizeClass,
    monsterVoice,
    kidsVoice,
    stats: { heightM, weightKg, favorite, cry, personality },
    discoveredDateLabel,
  };
}
