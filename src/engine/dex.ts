// Deterministic dex-card generation (ENGINE_SPEC §2). No LLM, no network.
//
// Honesty rule: claims about VISIBLE attributes (color, size) must match the
// actual drawing — colors come from on-device pixel analysis (analyze()), size
// from the bounding-box aspect. Whimsical flavor (personality, favourite food,
// cry, zone, diet) is seed-derived fantasy and does NOT assert anything visible,
// so it can vary freely. We never claim a literal category ("vehicle"/"bird")
// or features ("3 horns") we can't verify.

import { CRIES, FOODS, HABITS, KIDS_VOICE_TEMPLATES, MONSTER_VOICE_TEMPLATES, NAME_PARTS, PERSONALITIES, SPECIALS } from '../data/vocab';
import { makeRng, stableHash } from './seed';
import type { Attributes, Category, DexCard, Diet, SizeClass, Zone } from './types';

// Creature-only categories (this is a monster app — no "vehicle"). Used purely
// for internal name/flavor variety, never printed as a factual claim.
const CATEGORIES: Category[] = ['きょうりゅう', 'いきもの', 'とり', 'むし', 'うみのいきもの', 'ふしぎ'];

const ZONE_BY_CATEGORY: Record<Category, Zone> = {
  きょうりゅう: 'おにわ ぞく', いきもの: 'もり ぞく', とり: 'そら ぞく', むし: 'もり ぞく',
  うみのいきもの: 'みず ぞく', のりもの: 'おにわ ぞく', ふしぎ: 'よる ぞく',
};
const ZONE_SHORT: Record<Zone, string> = {
  'おにわ ぞく': 'おにわ', 'もり ぞく': 'もり', 'みず ぞく': 'みずべ', 'そら ぞく': 'そら', 'よる ぞく': 'よるのにわ',
};
const DIET_BY_CATEGORY: Record<Category, Diet> = {
  きょうりゅう: 'しょくぶつ食', いきもの: 'なんでも食', とり: 'しょくぶつ食', むし: 'しょくぶつ食',
  うみのいきもの: 'なんでも食', のりもの: 'ひかり食', ふしぎ: 'ひかり食',
};

// Japanese colour vocabulary with representative RGB. analyze() returns hex of
// the drawing's dominant pixels; we snap each to the nearest word.
const PALETTE: { word: string; rgb: [number, number, number] }[] = [
  { word: 'あか', rgb: [220, 50, 47] }, { word: 'ピンク', rgb: [255, 120, 170] },
  { word: 'だいだい', rgb: [245, 150, 40] }, { word: 'きいろ', rgb: [245, 215, 60] },
  { word: 'みどり', rgb: [85, 180, 90] }, { word: 'みずいろ', rgb: [90, 200, 235] },
  { word: 'あお', rgb: [40, 110, 210] }, { word: 'むらさき', rgb: [150, 75, 180] },
  { word: 'ちゃいろ', rgb: [130, 90, 60] }, { word: 'しろ', rgb: [245, 245, 245] },
  { word: 'くろ', rgb: [40, 40, 45] }, { word: 'はいいろ', rgb: [150, 150, 150] },
];

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

// Map analyze() hex colours → up to 3 distinct Japanese colour words.
export function mapHexToColorWords(hexes: string[]): string[] {
  const out: string[] = [];
  for (const hex of hexes) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    let best = PALETTE[0], bestD = Infinity;
    for (const p of PALETTE) {
      const d = (p.rgb[0] - rgb[0]) ** 2 + (p.rgb[1] - rgb[1]) ** 2 + (p.rgb[2] - rgb[2]) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!out.includes(best.word)) out.push(best.word);
    if (out.length >= 3) break;
  }
  return out;
}

// Append "いろの", but avoid doubling for words that already end in "いろ"
// (みずいろ → みずいろの, not みずいろいろの).
function withIro(w: string): string {
  return w.endsWith('いろ') ? w + 'の' : w + 'いろの';
}
function colorPhrase(colors: string[]): string {
  if (colors.length === 0) return 'カラフルな';
  if (colors.length === 1) return withIro(colors[0]);
  if (colors.length === 2) return colors[0] + 'と ' + withIro(colors[1]);
  return colors[0] + '・' + colors[1] + '・' + withIro(colors[2]);
}
const SIZE_WORD: Record<SizeClass, string> = { ちいさい: 'ちいさな', ふつう: '', おおきい: 'おおきな' };

// Attributes. Colours are REAL when provided by analyze(); category/size are the
// only other inputs and category is never surfaced as a literal claim.
export function deriveAttributes(pixelHash: string, aspect: number, realColors?: string[]): Attributes {
  const rng = makeRng(stableHash('attr:' + pixelHash));
  const category = rng.pick(CATEGORIES);
  const sizeClass: SizeClass = aspect > 1.4 ? 'おおきい' : aspect < 0.7 ? 'ちいさい' : 'ふつう';
  const colors = realColors && realColors.length ? realColors.slice(0, 3) : [];
  return { category, colors, sizeClass, aspect, hasHorns: false, hasLegs: true };
}

function nameCandidates(category: Category, rng: ReturnType<typeof makeRng>): string[] {
  const { heads, tails } = NAME_PARTS[category];
  const out = new Set<string>();
  let guard = 0;
  while (out.size < 3 && guard++ < 30) out.add(rng.pick(heads) + rng.pick(tails));
  return [...out];
}

function fill(tpl: string, map: Record<string, string>): string {
  return tpl.replace(/%([A-Z_0-9]+)%/g, (_, k) => map[k] ?? '').replace(/\s+/g, ' ').trim();
}

export function buildDexCard(params: {
  number: number; attributes: Attributes; seed: number; createdAtMs: number; overrideName?: string;
}): DexCard {
  const { number, attributes: attr, seed, createdAtMs, overrideName } = params;
  const rng = makeRng(seed);

  const candidates = nameCandidates(attr.category, rng);
  const name = overrideName?.trim() || candidates[0];
  const personality = rng.pick(PERSONALITIES);
  const favorite = rng.pick(FOODS);
  const cry = rng.pick(CRIES);
  const habit = rng.pick(HABITS);
  const special = rng.pick(SPECIALS);
  const zone = ZONE_BY_CATEGORY[attr.category];
  const diet = DIET_BY_CATEGORY[attr.category];

  const sizeFactor = attr.sizeClass === 'おおきい' ? 1.8 : attr.sizeClass === 'ちいさい' ? 0.5 : 1;
  const heightM = Math.round((0.2 + rng.next() * 0.6) * sizeFactor * 10) / 10;
  const weightKg = Math.round((0.8 + rng.next() * 2.5) * sizeFactor * 10) / 10;

  const slots: Record<string, string> = {
    ZONE: zone, ZONE_SHORT: ZONE_SHORT[zone],
    COLOR: colorPhrase(attr.colors), SIZE: SIZE_WORD[attr.sizeClass],
    FOOD: favorite, CRY: cry, PERSONA: personality, HABIT: habit, SPECIAL: special,
  };
  const monsterVoice = fill(rng.pick(MONSTER_VOICE_TEMPLATES), slots);
  const kidsVoice = fill(rng.pick(KIDS_VOICE_TEMPLATES), slots);

  const d = new Date(createdAtMs);
  const discoveredDateLabel = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} はっけん`;

  return {
    number, name, nameCandidates: candidates, diet, zone, category: attr.category, sizeClass: attr.sizeClass,
    monsterVoice, kidsVoice,
    stats: { heightM, weightKg, favorite, cry, personality },
    discoveredDateLabel,
  };
}
