// World-engine verification (run: `npx tsx src/engine/verify-world.ts`).
// Pure deterministic engine → assert on console, exit non-zero on failure.
import { stableHash } from './seed';
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
  const ownedEx: OwnedItem = { item: it, count: 1, firstDayOrdinal: 0 };
  const b: Bond = { points: 0, level: 0, title: 'であったばかり' };
  check('DiscoveryKind usable', k === 'たべた');
  check('Item usable', it.rarity === 'common');
  check('OwnedItem usable', ownedEx.count === 1);
  check('Bond usable', b.level === 0);

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

  console.log('\n— deriveBond grows over time, escalates titles —');
  const { deriveBond, welcomeLineFor } = await import('./bond');
  const DAY = 86_400_000;
  const created = 1000 * DAY;
  const mkb = (logKinds: string[]) => ({
    createdAtMs: created,
    log: logKinds.map((kk, i) => ({ dayOrdinal: 1000 + i, dateLabel: 'x', text: 't', kind: kk as any })),
  }) as any;
  const day1 = deriveBond(mkb([]), created + 1 * DAY);
  const day20 = deriveBond(mkb([]), created + 20 * DAY);
  const day40 = deriveBond(mkb([]), created + 40 * DAY);
  check('bond monotonic non-decreasing in time', day1.points <= day20.points && day20.points <= day40.points);
  check('title escalates by day 40', day40.level > day1.level, `${day1.level}->${day40.level}`);
  check('events add points', deriveBond(mkb(['なかよし', 'たべた']), created + 1 * DAY).points
    > deriveBond(mkb([]), created + 1 * DAY).points);
  check('level 0 title であったばかり', day1.title === 'であったばかり');
  check('welcomeLineFor fills name+summary',
    welcomeLineFor(0, 'モモ', 'やまに のぼった').includes('モモ')
    && welcomeLineFor(0, 'モモ', 'やまに のぼった').includes('やまに のぼった'));
  check('deriveBond stable on re-call',
    JSON.stringify(deriveBond(mkb(['なかよし']), created + 5 * DAY)) === JSON.stringify(deriveBond(mkb(['なかよし']), created + 5 * DAY)));

  console.log('\n— typed events: deterministic kind + sibling + weather —');
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
  const friendEntries = r1.newEntries.filter((e) => e.kind === 'なかよし');
  check('なかよし references a sibling', friendEntries.every((e) => e.text.includes('ココ') || e.text.includes('ルル')));
  const solo = whileAwayEvents({ ...base, siblingNames: [], lastOpenMs: 1000 * DAY2, nowMs: 1060 * DAY2 });
  check('no なかよし when solo', solo.newEntries.every((e) => e.kind !== 'なかよし'));
  check('summary is one of the new entries (or null)', r1.summary === null || r1.newEntries.includes(r1.summary));

  console.log('\n— mini-story arcs: sequential, single-active, replay-stable —');
  const wa = await import('./whileAway');
  const VV = await import('../data/vocab');
  const arcTexts = new Set(VV.ARCS.flatMap((a) => a.days));
  const longBase = { monsterId: 'arcmon', seed: 999, attributes: attrs, card, siblingNames: ['ココ'] };
  const long = wa.whileAwayEvents({ ...longBase, lastOpenMs: 1000 * DAY2, nowMs: 1200 * DAY2 });
  const longAgain = wa.whileAwayEvents({ ...longBase, lastOpenMs: 1000 * DAY2, nowMs: 1200 * DAY2 });
  check('arc replay-stable over long window', JSON.stringify(long) === JSON.stringify(longAgain));
  check('an arc line appears in window', long.newEntries.some((e) => arcTexts.has(e.text)));
  // window independence: starting later yields identical suffix (arc straddling boundary handled)
  const partial = wa.whileAwayEvents({ ...longBase, lastOpenMs: 1160 * DAY2, nowMs: 1200 * DAY2 });
  check('window start does not change shared-day entries',
    JSON.stringify(partial.newEntries) === JSON.stringify(long.newEntries.filter((e) => e.dayOrdinal > 1160)));
  const baseSeedArc = stableHash('away:arcmon:999');
  let okOffsets = true; let sawStart = false;
  for (let d = 1141; d <= 1200; d++) {
    const info = wa.__arcCoverForTest(baseSeedArc, d);
    if (!info) continue;
    if (info.offset === 0) sawStart = true;
    if (info.offset < 0 || info.offset >= info.arc.days.length) okOffsets = false;
  }
  check('arc offsets valid range', okOffsets);
  check('at least one arc start (offset 0) in window', sawStart);
  // spec ⑤: if an arc completes in the window, it is promoted to summary
  const arcFinals = new Set(VV.ARCS.map((a) => a.days[a.days.length - 1]));
  const completedInWindow = long.newEntries.some((e) => arcFinals.has(e.text));
  check('arc completion promoted to summary when present',
    !completedInWindow || (long.summary !== null && arcFinals.has(long.summary.text)));

  console.log('\n' + (failures === 0 ? '✅ ALL WORLD CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
})();
