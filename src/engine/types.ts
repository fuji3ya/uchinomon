// Core data contract for うちのモン. Derived from the prototype's zukan-card.html
// (the collectible the user pays for) + ENGINE_SPEC.md. Everything here is
// produced on-device with no network.

export type Category =
  | 'きょうりゅう'
  | 'いきもの'
  | 'とり'
  | 'むし'
  | 'うみのいきもの'
  | 'のりもの'
  | 'ふしぎ'; // fallback when on-device classifier is unsure

export type Diet = 'しょくぶつ食' | 'にく食' | 'なんでも食' | 'ひかり食';

export type Zone = 'おにわ ぞく' | 'もり ぞく' | 'みず ぞく' | 'そら ぞく' | 'よる ぞく';

export type SizeClass = 'ちいさい' | 'ふつう' | 'おおきい';

export type RenderMode = 'cut' | 'paper'; // cut = transparent cutout, paper = keep original (fallback)

export type TimeOfDay = 'あさ' | 'ひる' | 'ゆうがた' | 'よる';

export type Weather =
  | 'morning'
  | 'noon'
  | 'dusk'
  | 'night'
  | 'rain'
  | 'snow'
  | 'rainbow'
  | 'festival';

// Attributes extracted on-device from the drawing (ENGINE_SPEC §2.1).
// NOTE: color/category/shape extraction is a native/CoreImage concern; until that
// lands, deriveAttributes() produces a deterministic stand-in from the pixel hash
// so the rest of the engine is fully functional and testable.
export interface Attributes {
  category: Category;
  colors: string[]; // up to 3 kid-friendly color words, e.g. ['みどり','にじいろ']
  sizeClass: SizeClass;
  aspect: number; // bounding-box width/height ratio
}

export type DiscoveryKind =
  | 'たべた'
  | 'ひるね'
  | 'ぼうけん'
  | 'おみやげ'
  | 'てんき'
  | 'なかよし';

export type Rarity = 'common' | 'rare' | 'legend';

export interface Item {
  id: string;
  name: string; // ひらがな中心の表示名
  rarity: Rarity;
}

export interface OwnedItem {
  item: Item;
  count: number;
  firstDayOrdinal: number;
}

export interface Bond {
  points: number;
  level: number; // 0..3
  title: string; // であったばかり / なかよし / だいすき / しんゆう
}

export interface DiscoveryEntry {
  dayOrdinal: number; // calendar day the event happened
  dateLabel: string; // "5/27"
  text: string; // "よるの たんけんで きらきらの石を ひろった"
  kind?: DiscoveryKind; // undefined for legacy/first-discovery entries
  itemId?: string; // set only when kind === 'おみやげ'
}

export interface DexCard {
  number: number; // No.042 (assigned at intake, stable)
  name: string; // user-overridable; defaults to a seed-picked candidate
  nameCandidates: string[]; // suggestions shown at onboarding step 3
  diet: Diet;
  zone: Zone;
  category: Category;
  sizeClass: SizeClass;
  monsterVoice: string; // ③ モンずかん文体
  kidsVoice: string; // ④ こどもと よむ かいせつ
  stats: { heightM: number; weightKg: number; favorite: string; cry: string; personality: string };
  discoveredDateLabel: string; // "2026.5.25 はっけん"
}

export interface Monster {
  id: string; // stable id (pixel hash based)
  seed: number;
  createdAtMs: number;
  renderMode: RenderMode;
  originalUri: string; // file:// to original drawing
  cutUri: string | null; // file:// to transparent cutout (null in paper mode)
  attributes: Attributes;
  card: DexCard;
  log: DiscoveryEntry[]; // grows via while-away simulation
}
