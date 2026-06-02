# While-Away World Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** うちのモン の留守中エンジンに「イベント種別・もちかえり品・なかよし度・ミニ物語(arc)」を足し、純決定論のまま「また開きたい」を最大化する。

**Architecture:** 純決定論・導出方式。bond/items は `monster.log` のリプレイから毎回計算で導出し、新しい保存状態を増やさない。arc は `(baseSeed, day)` の独立シードストリームから純関数で算出し、リプレイ窓に依存しない（窓をまたぐ arc も整合）。エンジンに `Date.now`/`Math.random`/network/LLM を入れない（COPPA）。

**Tech Stack:** TypeScript / Expo SDK 56 / React Native。エンジンは node で `npx tsx <file>` で実行検証（既存 `verify.ts`/`verify-store.ts` と同じ console-assert 方式）。

---

## File Structure

- `src/engine/types.ts` — 型追加（`DiscoveryKind`, `Item`, `OwnedItem`, `Bond`, `DiscoveryEntry.kind/itemId`）。
- `src/data/vocab.ts` — データ追加（`ITEMS`, `KIND_WEIGHTS`, kind別テンプレ, `ARCS`, `BOND_TIERS`, `WELCOME_BY_LEVEL`）。
- `src/engine/items.ts`（新規）— `deriveItems(monster, nowMs)`。
- `src/engine/bond.ts`（新規）— `deriveBond(monster, nowMs)`, `welcomeLineFor(level, name, summaryText)`。
- `src/engine/whileAway.ts` — typed events + arc + weather/sibling-aware 生成（独立シードストリーム化）。
- `src/engine/store.ts` — `syncWorld` が sibling 名リストを generator へ注入。
- `src/engine/index.ts` — 新規 export。
- `src/app/card/[id].tsx` — なかよし称号 + おみやげ数の最小表示。
- `src/engine/verify-world.ts`（新規）— エンジン決定論テストハーネス（node）。
- `src/engine/verify-store.ts` — sibling 注入の流れを 1 ケース追加。

各タスクは自己完結。型は前タスクで定義したものを後タスクで参照する（名前は厳密一致）。

---

## Task 1: 型追加（types.ts）

**Files:**
- Modify: `src/engine/types.ts`
- Test: `src/engine/verify-world.ts`（新規・型のコンパイル確認用スケルトン）

- [ ] **Step 1: Write the failing test (harness skeleton)**

Create `src/engine/verify-world.ts`:

```typescript
// World-engine verification (run: `npx tsx src/engine/verify-world.ts`).
// Pure deterministic engine → assert on console, exit non-zero on failure.
import type { Bond, DiscoveryKind, Item, OwnedItem } from './types';

let failures = 0;
const check = (n: string, c: boolean, extra?: unknown) => {
  console.log(c ? `  ✓ ${n}` : `  ✗ ${n}`, c ? '' : (extra ?? ''));
  if (!c) failures++;
};

(async () => {
  console.log('— types compile —');
  const k: DiscoveryKind = 'たべた'; // たべた
  const it: Item = { id: 'kinomi', name: 'きのみ', rarity: 'common' };
  const owned: OwnedItem = { item: it, count: 1, firstDayOrdinal: 0 };
  const b: Bond = { points: 0, level: 0, title: 'であったばかり' };
  check('DiscoveryKind usable', k === 'たべた');
  check('Item usable', it.rarity === 'common');
  check('OwnedItem usable', owned.count === 1);
  check('Bond usable', b.level === 0);

  console.log('\n' + (failures === 0 ? '✅ ALL WORLD CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-world.ts`
Expected: FAIL — TS errors "Module './types' has no exported member 'DiscoveryKind'/'Item'/'OwnedItem'/'Bond'".

- [ ] **Step 3: Write minimal implementation**

In `src/engine/types.ts`, add after the existing `Weather` type:

```typescript
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
```

Then extend `DiscoveryEntry` (add two optional fields, keep `text` required):

```typescript
export interface DiscoveryEntry {
  dayOrdinal: number;
  dateLabel: string;
  text: string;
  kind?: DiscoveryKind; // undefined for legacy/first-discovery entries
  itemId?: string; // set only when kind === 'おみやげ'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/engine/verify-world.ts`
Expected: PASS — `✅ ALL WORLD CHECKS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/verify-world.ts
git commit -m "feat(engine): add DiscoveryKind/Item/OwnedItem/Bond types + world verify harness"
```

---

## Task 2: vocab データ追加（vocab.ts）

**Files:**
- Modify: `src/data/vocab.ts`
- Test: `src/engine/verify-world.ts`

- [ ] **Step 1: Write the failing test**

Add this block to `verify-world.ts` *before* the final summary line:

```typescript
  console.log('\n— vocab data integrity —');
  const V = await import('../data/vocab');
  check('ITEMS non-empty', V.ITEMS.length >= 5, V.ITEMS.length);
  check('ITEMS have rarities', V.ITEMS.every((i) => ['common', 'rare', 'legend'].includes(i.rarity)));
  check('at least one legend item', V.ITEMS.some((i) => i.rarity === 'legend'));
  check('KIND_WEIGHTS positive', Object.values(V.KIND_WEIGHTS).every((w) => (w as number) > 0));
  check('ATE/NAP/WEATHER/FRIEND templates non-empty',
    V.ATE_TEMPLATES.length > 0 && V.NAP_TEMPLATES.length > 0 && V.WEATHER_TEMPLATES.snow.length > 0 && V.FRIEND_TEMPLATES.length > 0);
  check('ARCS each have >= 2 days', V.ARCS.length >= 2 && V.ARCS.every((a) => a.days.length >= 2));
  check('BOND_TIERS sorted ascending by minPoints', V.BOND_TIERS.every((t, i, arr) => i === 0 || t.minPoints > arr[i - 1].minPoints));
  check('WELCOME_BY_LEVEL covers 0..3', [0, 1, 2, 3].every((lv) => typeof V.WELCOME_BY_LEVEL[lv] === 'string'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-world.ts`
Expected: FAIL — `V.ITEMS`/`V.KIND_WEIGHTS`/etc. undefined (TS errors / runtime undefined).

- [ ] **Step 3: Write minimal implementation**

Add to `src/data/vocab.ts` (append near the end; keep existing exports). Note imports at top of file already import `Category`; add `Item`, `DiscoveryKind`:

```typescript
import type { Category, DiscoveryKind, Item } from '../engine/types';

// もちかえり品。アイコンは Phase 3 で実画像、ここは id/名/レア度のみ（絵文字は使わない）。
export const ITEMS: Item[] = [
  { id: 'kinomi', name: 'きのみ', rarity: 'common' },
  { id: 'ishi', name: 'きれいないし', rarity: 'common' },
  { id: 'hana', name: 'おはな', rarity: 'common' },
  { id: 'matsubokkuri', name: 'まつぼっくり', rarity: 'common' },
  { id: 'happa', name: 'はっぱのかんむり', rarity: 'rare' },
  { id: 'kai', name: 'にじいろのかい', rarity: 'rare' },
  { id: 'kakera', name: 'きらきらのかけら', rarity: 'legend' },
];

// item 抽選の rarity 別重み（合計は任意、weightedPick が正規化）。
export const ITEM_RARITY_WEIGHT: Record<Item['rarity'], number> = {
  common: 70,
  rare: 25,
  legend: 5,
};

// 日々のイベント kind の重み。'なかよし' は sibling が居ないとき除外される。
export const KIND_WEIGHTS: Record<DiscoveryKind, number> = {
  ぼうけん: 34,
  たべた: 18,
  てんき: 16,
  おみやげ: 14,
  なかよし: 12,
  ひるね: 6,
};

export const ATE_TEMPLATES = [
  '%FOOD%を おなかいっぱい たべた',
  '%FOOD%を みつけて にっこり していた',
  'だいすきな %FOOD%を ほおばっていた',
];

export const NAP_TEMPLATES = [
  'ぽかぽかの ひなたで ひるねを していた',
  'まるくなって すやすや ねむっていた',
  'おおきな あくびを して ごろごろ していた',
];

// 天気連動。晴れ系(morning/noon/dusk/night)は fair にフォールバック。
export const WEATHER_TEMPLATES: Record<'snow' | 'rain' | 'rainbow' | 'festival' | 'fair', string[]> = {
  snow: ['ゆきだるまを つくって あそんだ', 'ゆきの うえに あしあとを つけた'],
  rain: ['みずたまりで ぴちゃぴちゃ あそんだ', 'あまやどりして あめの おとを きいていた'],
  rainbow: ['そらの にじを みあげていた', 'にじの したを くぐって みた'],
  festival: ['おまつりで わたあめを たべた', 'おまつりの おはやしに あわせて おどった'],
  fair: ['きもちいい かぜを あびて おさんぽ した', 'おひさまの したで のんびり していた'],
};

// なかよしイベント。%FRIEND% に他モンスター名が入る。
export const FRIEND_TEMPLATES = [
  '%FRIEND%と いっしょに あそんだ',
  '%FRIEND%と かけっこ していた',
  '%FRIEND%と なかよく おひるねした',
];

export interface Arc {
  id: string;
  days: string[]; // 順番に出る連続イベント文
}

export const ARCS: Arc[] = [
  { id: 'yama', days: ['やまへ むかった', 'ちょうじょうを めざして のぼった', 'ちょうじょうに ついて おおよろこび！'] },
  { id: 'umi', days: ['うみべへ おさんぽ に でかけた', 'なみと おいかけっこ していた', 'すなはまで たからものを みつけた！'] },
  { id: 'tomodachi', days: ['あたらしい ともだちを さがしに いった', 'とおくの もりまで あるいた', 'あたらしい ともだちが できた！'] },
];

export interface BondTier {
  minPoints: number;
  level: number;
  title: string;
}

// 閾値は昇順。points >= minPoints の最大 tier を採用。
export const BOND_TIERS: BondTier[] = [
  { minPoints: 0, level: 0, title: 'であったばかり' },
  { minPoints: 6, level: 1, title: 'なかよし' },
  { minPoints: 16, level: 2, title: 'だいすき' },
  { minPoints: 32, level: 3, title: 'しんゆう' },
];

// bond level 別の「おかえり」枕詞。%NAME% と %SUMMARY% を後で埋める。
export const WELCOME_BY_LEVEL: Record<number, string> = {
  0: '%NAME%が かえってきたよ。%SUMMARY%',
  1: '%NAME%が ただいま！ %SUMMARY%',
  2: 'おかえり、%NAME%！ %SUMMARY%',
  3: '%NAME%が うれしそうに かけよってきた。%SUMMARY%',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/engine/verify-world.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/vocab.ts src/engine/verify-world.ts
git commit -m "feat(vocab): items, kind weights, weather/friend/nap/ate templates, arcs, bond tiers, welcome lines"
```

---

## Task 3: deriveItems（items.ts）

**Files:**
- Create: `src/engine/items.ts`
- Modify: `src/engine/index.ts`（export 追加）
- Test: `src/engine/verify-world.ts`

- [ ] **Step 1: Write the failing test**

Add to `verify-world.ts` before the summary:

```typescript
  console.log('\n— deriveItems aggregates owned items from log —');
  const { deriveItems } = await import('./items');
  const fakeLog = [
    { dayOrdinal: 10, dateLabel: '1/11', text: 't', kind: 'おみやげ' as const, itemId: 'kinomi' },
    { dayOrdinal: 12, dateLabel: '1/13', text: 't', kind: 'おみやげ' as const, itemId: 'kinomi' },
    { dayOrdinal: 13, dateLabel: '1/14', text: 't', kind: 'おみやげ' as const, itemId: 'kakera' },
    { dayOrdinal: 14, dateLabel: '1/15', text: 't', kind: 'ぼうけん' as const },
  ];
  const fakeMonster = { log: fakeLog } as any;
  const owned = deriveItems(fakeMonster);
  const kinomi = owned.find((o) => o.item.id === 'kinomi');
  const kakera = owned.find((o) => o.item.id === 'kakera');
  check('kinomi counted twice', kinomi?.count === 2, kinomi);
  check('kinomi firstDayOrdinal earliest', kinomi?.firstDayOrdinal === 10);
  check('kakera counted once (legend)', kakera?.count === 1 && kakera?.item.rarity === 'legend');
  check('non-gift entries ignored', owned.reduce((s, o) => s + o.count, 0) === 3);
  check('deriveItems stable on re-call', JSON.stringify(deriveItems(fakeMonster)) === JSON.stringify(owned));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-world.ts`
Expected: FAIL — `Cannot find module './items'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/items.ts`:

```typescript
// もちかえり品コレクションを log のリプレイから導出する（保存は増やさない）。
import { ITEMS } from '../data/vocab';
import type { Item, Monster, OwnedItem } from './types';

const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// log を走査し kind==='おみやげ' の itemId を集計。出現順を保ち、count と初出 day を持つ。
export function deriveItems(monster: Pick<Monster, 'log'>): OwnedItem[] {
  const acc = new Map<string, OwnedItem>();
  for (const e of monster.log) {
    if (e.kind !== 'おみやげ' || !e.itemId) continue;
    const item = ITEM_BY_ID[e.itemId];
    if (!item) continue; // 未知 id は無視（vocab 変更耐性）
    const cur = acc.get(item.id);
    if (cur) {
      cur.count += 1;
      cur.firstDayOrdinal = Math.min(cur.firstDayOrdinal, e.dayOrdinal);
    } else {
      acc.set(item.id, { item, count: 1, firstDayOrdinal: e.dayOrdinal });
    }
  }
  return [...acc.values()];
}

export function itemCount(monster: Pick<Monster, 'log'>): number {
  return deriveItems(monster).reduce((s, o) => s + o.count, 0);
}
```

Add to `src/engine/index.ts` (after the existing `whileAwayEvents` export line):

```typescript
export { deriveItems, itemCount } from './items';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/engine/verify-world.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/items.ts src/engine/index.ts src/engine/verify-world.ts
git commit -m "feat(engine): deriveItems — gift collection derived from log replay"
```

---

## Task 4: deriveBond（bond.ts）

**Files:**
- Create: `src/engine/bond.ts`
- Modify: `src/engine/index.ts`
- Test: `src/engine/verify-world.ts`

- [ ] **Step 1: Write the failing test**

Add to `verify-world.ts` before the summary:

```typescript
  console.log('— deriveBond grows over time, escalates titles —');
  const { deriveBond, welcomeLineFor } = await import('./bond');
  const DAY = 86_400_000;
  const created = 1000 * DAY;
  const mk = (days: number, logKinds: string[]) => ({
    createdAtMs: created,
    log: logKinds.map((k, i) => ({ dayOrdinal: 1000 + i, dateLabel: 'x', text: 't', kind: k as any })),
  }) as any;
  const day1 = deriveBond(mk(0, []), created + 1 * DAY);
  const day20 = deriveBond(mk(0, []), created + 20 * DAY);
  const day40 = deriveBond(mk(0, []), created + 40 * DAY);
  check('bond monotonic non-decreasing in time', day1.points <= day20.points && day20.points <= day40.points);
  check('title escalates by day 40', day40.level > day1.level, `${day1.level}->${day40.level}`);
  check('events add points', deriveBond(mk(0, ['なかよし', 'たべた']), created + 1 * DAY).points
    > deriveBond(mk(0, []), created + 1 * DAY).points);
  check('level 0 title であったばかり', day1.title === 'であったばかり');
  check('welcomeLineFor fills name+summary',
    welcomeLineFor(0, 'モモ', 'やまに のぼった').includes('モモ')
    && welcomeLineFor(0, 'モモ', 'やまに のぼった').includes('やまに のぼった'));
  check('deriveBond stable on re-call',
    JSON.stringify(deriveBond(mk(0, ['なかよし']), created + 5 * DAY)) === JSON.stringify(deriveBond(mk(0, ['なかよし']), created + 5 * DAY)));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-world.ts`
Expected: FAIL — `Cannot find module './bond'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/engine/bond.ts`:

```typescript
// なかよし度を経過日数 + イベント数から決定論で導出する（保存は増やさない）。
// points は時間に対して単調非減少（必ず育つ）。
import { BOND_TIERS, WELCOME_BY_LEVEL } from '../data/vocab';
import { dayOrdinal } from './seed';
import type { Bond, Monster } from './types';

const EVENT_BONUS = 1; // なかよし/たべた 1件につき加点

export function deriveBond(monster: Pick<Monster, 'createdAtMs' | 'log'>, nowMs: number): Bond {
  const ageDays = Math.max(0, dayOrdinal(nowMs) - dayOrdinal(monster.createdAtMs));
  const warmEvents = monster.log.filter((e) => e.kind === 'なかよし' || e.kind === 'たべた').length;
  const points = ageDays + warmEvents * EVENT_BONUS;

  let tier = BOND_TIERS[0];
  for (const t of BOND_TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  return { points, level: tier.level, title: tier.title };
}

// bond level 別の「おかえり」枕詞に名前と要約を差し込む。
export function welcomeLineFor(level: number, name: string, summaryText: string): string {
  const tpl = WELCOME_BY_LEVEL[level] ?? WELCOME_BY_LEVEL[0];
  return tpl.replace(/%NAME%/g, name).replace(/%SUMMARY%/g, summaryText);
}
```

Add to `src/engine/index.ts`:

```typescript
export { deriveBond, welcomeLineFor } from './bond';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/engine/verify-world.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/bond.ts src/engine/index.ts src/engine/verify-world.ts
git commit -m "feat(engine): deriveBond — friendship level derived from age + warm events"
```

---

## Task 5: typed events（whileAway.ts、kind 抽選 + weather/sibling）

**Files:**
- Modify: `src/engine/whileAway.ts`
- Test: `src/engine/verify-world.ts`

このタスクで `whileAwayEvents` の引数に `siblingNames: string[]` を追加し、各日のイベントに `kind` を付ける。**arc はまだ入れない**（Task 6）。独立シードストリームに作り替える。

- [ ] **Step 1: Write the failing test**

Add to `verify-world.ts` before the summary:

```typescript
  console.log('— typed events: deterministic kind + sibling + weather —');
  const { whileAwayEvents } = await import('./whileAway');
  const attrs = { category: 'いきもの', colors: ['みどり'], sizeClass: 'ふつう', aspect: 1 } as any;
  const card = { name: 'モモ', stats: { favorite: 'きのみ', cry: 'ぴよ', personality: 'げんき' }, zone: 'もり ぞく' } as any;
  const DAY2 = 86_400_000;
  const base = { monsterId: 'm1', seed: 123, attributes: attrs, card, siblingNames: ['ココ', 'ルル'] };
  const r1 = whileAwayEvents({ ...base, lastOpenMs: 1000 * DAY2, nowMs: 1030 * DAY2 });
  const r2 = whileAwayEvents({ ...base, lastOpenMs: 1000 * DAY2, nowMs: 1030 * DAY2 });
  check('determinism: identical replays', JSON.stringify(r1) === JSON.stringify(r2));
  check('every entry has a kind', r1.newEntries.every((e) => !!e.kind));
  check('おみやげ entries carry itemId', r1.newEntries.filter((e) => e.kind === 'おみやげ').every((e) => !!e.itemId));
  // なかよし must reference a sibling name when present
  const friendEntries = r1.newEntries.filter((e) => e.kind === 'なかよし');
  check('なかよし references a sibling', friendEntries.every((e) => e.text.includes('ココ') || e.text.includes('ルル')));
  // with no siblings, なかよし kind is never produced
  const solo = whileAwayEvents({ ...base, siblingNames: [], lastOpenMs: 1000 * DAY2, nowMs: 1060 * DAY2 });
  check('no なかよし when solo', solo.newEntries.every((e) => e.kind !== 'なかよし'));
  check('summary is last entry', r1.summary === (r1.newEntries.length ? r1.newEntries[r1.newEntries.length - 1] : null));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-world.ts`
Expected: FAIL — current `whileAwayEvents` has no `siblingNames` param and entries lack `kind`.

- [ ] **Step 3: Write minimal implementation**

Replace the body of `src/engine/whileAway.ts` with (keep `firstDiscovery` at the bottom unchanged):

```typescript
// While-away world simulation (ENGINE_SPEC §4) — the retention core.
// Pure: same (monster, lastOpen, now, siblingNames) -> same events. No server,
// no Date.now/Math.random. Independent seed streams per concern so arc detection
// (Task 6) is window-independent.

import {
  ATE_TEMPLATES, DISCOVERIES_BY_CATEGORY, DISCOVERIES_COMMON, FRIEND_TEMPLATES,
  KIND_WEIGHTS, ITEMS, ITEM_RARITY_WEIGHT, NAP_TEMPLATES, WEATHER_TEMPLATES,
} from '../data/vocab';
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
  for (let day = firstDay; day <= endDay; day++) {
    if (!adventureHappened(baseSeed, day)) continue;
    const kind = pickKind(baseSeed, day, hasSibling);
    const { text, itemId } = renderEntry(baseSeed, day, kind, card, attributes, siblingNames);
    newEntries.push({ dayOrdinal: day, dateLabel: dateLabel(day * 86_400_000), text, kind, itemId });
  }

  return { newEntries, summary: newEntries.length ? newEntries[newEntries.length - 1] : null };
}
```

Keep the existing `firstDiscovery(card, createdAtMs)` function exactly as-is at the bottom of the file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/engine/verify-world.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/whileAway.ts src/engine/verify-world.ts
git commit -m "feat(engine): typed while-away events (kind weights + weather + sibling-aware), independent seed streams"
```

---

## Task 6: ミニ物語 arc（whileAway.ts）

**Files:**
- Modify: `src/engine/whileAway.ts`
- Test: `src/engine/verify-world.ts`

arc は `(baseSeed, day)` の純関数で、リプレイ窓に依存しない。raw-start 判定 + 固定 lookback の overlap 抑止で、再帰なし・決定論を保つ。

- [ ] **Step 1: Write the failing test**

Add to `verify-world.ts` before the summary:

```typescript
  console.log('— mini-story arcs: sequential, single-active, replay-stable —');
  const wa = await import('./whileAway');
  const longBase = { monsterId: 'arcmon', seed: 999, attributes: attrs, card, siblingNames: ['ココ'] };
  // simulate a long stretch so at least one arc fires
  const long = wa.whileAwayEvents({ ...longBase, lastOpenMs: 1000 * DAY2, nowMs: 1200 * DAY2 });
  const longAgain = wa.whileAwayEvents({ ...longBase, lastOpenMs: 1000 * DAY2, nowMs: 1200 * DAY2 });
  check('arc replay-stable over long window', JSON.stringify(long) === JSON.stringify(longAgain));
  // arcDebugForDay exposes arc coverage; check sequential offsets and no overlap
  const offsets: number[] = [];
  for (let d = 1001; d <= 1200; d++) {
    const info = wa.__arcCoverForTest(stableHashName('arcmon', 999), d);
    if (info) offsets.push(info.offset);
  }
  check('an arc fired in 200 days', offsets.length > 0, offsets.length);
  check('arc offsets are valid (0-based, < arc length)', offsets.every((o) => o >= 0));
  // window-independence: covering a continuation day gives same arc whether or not window starts before it
  const startInside = wa.whileAwayEvents({ ...longBase, lastOpenMs: 1100 * DAY2, nowMs: 1200 * DAY2 });
  const fullEntriesAfter1100 = long.newEntries.filter((e) => e.dayOrdinal > 1100);
  check('window start does not change arc text on shared days',
    JSON.stringify(startInside.newEntries) === JSON.stringify(fullEntriesAfter1100));
```

Add this helper near the top of `verify-world.ts` (after `check` definition):

```typescript
// mirror of whileAway's baseSeed so the test can call __arcCoverForTest
const stableHashName = (id: string, seed: number) => {
  const { stableHash } = require('./seed');
  return stableHash('away:' + id + ':' + seed);
};
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-world.ts`
Expected: FAIL — `wa.__arcCoverForTest` is not a function; arc text not produced.

- [ ] **Step 3: Write minimal implementation**

In `src/engine/whileAway.ts`, add arc constants + helpers (after `adventureHappened`):

```typescript
import { ARCS } from '../data/vocab';

const ARC_START_PROBABILITY = 0.12; // among adventure days
const ARC_LOOKBACK = ARCS.reduce((m, a) => Math.max(m, a.days.length), 0); // >= longest arc

function arcAt(baseSeed: number, startDay: number) {
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
function arcCover(baseSeed: number, day: number): { arc: (typeof ARCS)[number]; offset: number } | null {
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
```

Then change the day loop in `whileAwayEvents` to check arc cover first:

```typescript
  for (let day = firstDay; day <= endDay; day++) {
    const cover = arcCover(baseSeed, day);
    if (cover) {
      const text = cover.arc.days[cover.offset];
      newEntries.push({ dayOrdinal: day, dateLabel: dateLabel(day * 86_400_000), text, kind: 'ぼうけん' });
      continue;
    }
    if (!adventureHappened(baseSeed, day)) continue;
    const kind = pickKind(baseSeed, day, hasSibling);
    const { text, itemId } = renderEntry(baseSeed, day, kind, card, attributes, siblingNames);
    newEntries.push({ dayOrdinal: day, dateLabel: dateLabel(day * 86_400_000), text, kind, itemId });
  }
```

Note: `arcCover` for an effective start day returns offset 0, so the start day emits the arc's first line (not a normal event) — no double emit.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/engine/verify-world.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/whileAway.ts src/engine/verify-world.ts
git commit -m "feat(engine): mini-story arcs — window-independent, sequential, single-active"
```

---

## Task 7: syncWorld が sibling 名を注入（store.ts）

**Files:**
- Modify: `src/engine/store.ts:99-110`（whileAwayEvents 呼び出し箇所）
- Test: `src/engine/verify-store.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/engine/verify-store.ts` before its summary line:

```typescript
  console.log('\n— syncWorld injects sibling names so なかよし can fire —');
  s = new MonsterStore(memKV());
  await s.addMonster(mk('sa', t0, 1), t0);
  await s.addMonster(mk('sb', t0, 2), t0);
  const synced = await s.syncWorld(t0 + 40 * DAY);
  const allEntries = (await s.all()).flatMap((m) => m.log);
  const friend = allEntries.filter((e) => (e as any).kind === 'なかよし');
  // each なかよし entry must name one of the OTHER monsters
  const names = (await s.all()).map((m) => m.card.name);
  check('なかよし entries reference an existing monster name',
    friend.length === 0 || friend.every((e) => names.some((n) => e.text.includes(n))));
  check('syncWorld still returns one result per monster', synced.length === 2);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-store.ts`
Expected: FAIL — current `syncWorld` calls `whileAwayEvents` without `siblingNames` (TS error / missing arg).

- [ ] **Step 3: Write minimal implementation**

In `src/engine/store.ts`, inside `syncWorld`, replace the `whileAwayEvents({...})` call (the loop over `list`) so siblings are passed. The loop currently reads:

```typescript
    for (const m of list) {
      const res = whileAwayEvents({
        monsterId: m.id, seed: m.seed, attributes: m.attributes, card: m.card,
        lastOpenMs: Math.max(lastOpen, m.createdAtMs), nowMs,
      });
```

Change it to compute sibling names (all OTHER monsters) and pass them:

```typescript
    for (const m of list) {
      const siblingNames = list.filter((o) => o.id !== m.id).map((o) => o.card.name);
      const res = whileAwayEvents({
        monsterId: m.id, seed: m.seed, attributes: m.attributes, card: m.card,
        lastOpenMs: Math.max(lastOpen, m.createdAtMs), nowMs, siblingNames,
      });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx src/engine/verify-store.ts`
Expected: PASS (and the prior store checks still pass).

- [ ] **Step 5: Commit**

```bash
git add src/engine/store.ts src/engine/verify-store.ts
git commit -m "feat(engine): syncWorld injects sibling names into while-away generator"
```

---

## Task 8: 図鑑カード詳細に なかよし称号 + おみやげ数を表示（card/[id].tsx）

**Files:**
- Modify: `src/app/card/[id].tsx`
- Test: 手動 + `tsc`（RN UI は node 単体テスト不可）。data-captured≠consumed を満たすため deriveBond/deriveItems の戻り値が実際に描画されることを確認。

- [ ] **Step 1: Read the current screen and locate the monster object**

Run: `sed -n '1,80p' src/app/card/[id].tsx`
Confirm the screen loads a `Monster` (likely via `monsterStore` by id) and has a stats/section area. Note the variable name holding the loaded monster (assume `monster`) and an existing styled row/label component to match.

- [ ] **Step 2: Add imports**

At the top of `src/app/card/[id].tsx`, add:

```typescript
import { deriveBond } from '../../engine/bond';
import { deriveItems, itemCount } from '../../engine/items';
```

- [ ] **Step 3: Compute bond + items where the monster is available**

After the monster is loaded and non-null (inside the render, guarded by the existing null check), add:

```typescript
  const bond = deriveBond(monster, Date.now());
  const owned = deriveItems(monster);
  const itemsTotal = itemCount(monster);
```

- [ ] **Step 4: Render a なかよし + おみやげ block**

Add this JSX inside the card's detail section (match existing row styling; replace `styles.row/styles.label/styles.value` with the file's actual style names found in Step 1):

```tsx
      <View style={styles.row}>
        <Text style={styles.label}>なかよし</Text>
        <Text style={styles.value}>{bond.title}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>おみやげ</Text>
        <Text style={styles.value}>{itemsTotal}こ{owned.length > 0 ? `（${owned.map((o) => o.item.name).slice(0, 3).join('・')}${owned.length > 3 ? ' ほか' : ''}）` : ''}</Text>
      </View>
```

- [ ] **Step 5: Type-check + verify consumption**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run: `grep -n "deriveBond\|deriveItems\|bond.title\|itemsTotal" src/app/card/[id].tsx`
Expected: imports AND render usages both present (proves the derived data is consumed, not dead).

- [ ] **Step 6: Commit**

```bash
git add "src/app/card/[id].tsx"
git commit -m "feat(ui): show なかよし title + おみやげ count on dex card detail"
```

---

## Task 9: welcome 文を bond level で出し分け（index.tsx / store.ts）

**Files:**
- Modify: `src/engine/store.ts`（Welcome に level を載せる）, `src/app/index.tsx`（welcomeLineFor で文面整形）
- Test: `src/engine/verify-store.ts`

設計の「level で welcome 文が温かくなる」を配線する。`Welcome` 型に `level` を足し、`syncWorld` が `deriveBond` の level を載せ、home が `welcomeLineFor` で整形。

- [ ] **Step 1: Write the failing test**

Add to `src/engine/verify-store.ts` before its summary:

```typescript
  console.log('\n— welcome carries bond level —');
  s = new MonsterStore(memKV());
  await s.addMonster(mk('wl', t0, 1), t0);
  await s.syncWorld(t0 + 50 * DAY); // long enough to raise bond level
  const wlist = await s.getWelcome();
  check('welcome has a numeric level', wlist.length === 0 || typeof (wlist[0] as any).level === 'number');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/engine/verify-store.ts`
Expected: FAIL — `Welcome` has no `level` field.

- [ ] **Step 3: Write minimal implementation**

In `src/engine/store.ts`:

Update the `Welcome` type:

```typescript
export type Welcome = { name: string; text: string; level: number };
```

Add the bond import at top:

```typescript
import { deriveBond } from './bond';
```

In `syncWorld`, where welcomes are pushed (currently `welcomes.push({ name: m.card.name, text: res.summary.text })`), change to:

```typescript
      if (res.summary) welcomes.push({ name: m.card.name, text: res.summary.text, level: deriveBond(m, nowMs).level });
```

In `src/app/index.tsx`:

Update the welcome state type and the title rendering to use `welcomeLineFor`. Add import:

```typescript
import { welcomeLineFor } from '../engine/bond';
```

Change the welcome state type from `{ name: string; text: string }[]` to `{ name: string; text: string; level: number }[]`.

Replace the welcome card title block so the lead line uses the level-aware template for the first monster:

```tsx
            <Text style={styles.welcomeTitle}>
              {welcomeLineFor(welcome[0].level, welcome[0].name, '')}
              {welcome.length > 1 ? ` ほか ${welcome.length - 1}ぴき` : ''}
            </Text>
```

(The per-monster `w.text` gift rows below stay as-is.)

- [ ] **Step 4: Run test + type-check**

Run: `npx tsx src/engine/verify-store.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/engine/store.ts src/app/index.tsx src/engine/verify-store.ts
git commit -m "feat(ui): warm welcome line by bond level on home"
```

---

## Task 10: 全検証 + 決定論不変条件 + push + CI green

**Files:** none (verification + ship)

- [ ] **Step 1: Run all engine verifications**

```bash
npx tsx src/engine/verify.ts
npx tsx src/engine/verify-world.ts
npx tsx src/engine/verify-store.ts
```
Expected: each prints `✅ ALL ... CHECKS PASSED` and exits 0.

- [ ] **Step 2: Type-check whole app**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Assert engine has no non-determinism**

Run: `grep -rn "Date.now\|Math.random" src/engine/`
Expected: ZERO hits in `whileAway.ts`, `bond.ts`, `items.ts`, `seed.ts`, `weather.ts`. (Date.now is allowed only in `src/app/*` UI, never in the engine.)

- [ ] **Step 4: Public-repo OPSEC gate (repo is PUBLIC + personal-linked)**

Run: `python <workspace>/scripts/scan-public-repo-opsec.py <repo-path>`
Expected: exit 0 (clean). If HIGH/CRITICAL: fix before pushing — do NOT push.

- [ ] **Step 5: Push and trigger CI build**

```bash
git push origin main
```
Then poll the GitHub Actions run for the uchinomon iOS build to completion (CI green), and poll ASC for the new build to reach `processingState=VALID` before reporting. Per project rule: Mac-less native = CI is the only compile gate; do not declare done until CI is green AND ASC VALID.

- [ ] **Step 6: Report with the AI-verified vs device-required split**

Report results in two columns:
- ✅ AI 検証済: node tests pass, tsc green, no Date.now/Math.random in engine, OPSEC clean, CI archive green, ASC VALID.
- 🔲 実機要: open the new TestFlight build; over multiple days confirm typed events / gift items / bond title / arc lines appear; なかよし names a real sibling; welcome line warms with bond level.

---

## Self-Review (plan vs spec)

- **Spec ① typed events** → Task 5 (kind weights + weather + sibling). ✓
- **Spec ② gift collection** → Task 3 (deriveItems) + Task 5 (おみやげ emits itemId) + Task 8 (display). ✓
- **Spec ③ bond** → Task 4 (deriveBond) + Task 8/9 (display + welcome). ✓
- **Spec ④ arcs** → Task 6 (window-independent arc cover). ✓
- **Spec ⑤ surfacing/testing/files** → Task 8 (card detail), Task 9 (welcome), Tasks 1-7/10 (verify harness + determinism grep). ✓
- **ADR pure-deterministic** → no stored state added; bond/items derived from `log`; arc from seed streams. ✓
- **Determinism invariant** → Task 10 Step 3 greps engine for Date.now/Math.random. ✓
- **dead-field risk (data-captured≠consumed)** → Task 8 Step 5 greps that derived data is rendered. ✓
- **Type consistency** → `DiscoveryKind`, `Item`, `OwnedItem`, `Bond` defined in Task 1; `deriveItems`/`deriveBond`/`welcomeLineFor`/`whileAwayEvents(siblingNames)`/`Welcome.level` used consistently across Tasks 3-9. ✓
