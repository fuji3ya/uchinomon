// Store-logic verification (run: `npx tsx src/engine/verify-store.ts`).
// Uses an in-memory KV so the free/Pro boundaries + while-away persistence are
// testable without a device.

import { buildMonster } from './index';
import { KV, MonsterStore } from './store';

function memKV(): KV {
  const m = new Map<string, string>();
  return { get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v) };
}

let failures = 0;
const check = (n: string, c: boolean, extra?: unknown) => {
  console.log(c ? `  ✓ ${n}` : `  ✗ ${n}`, c ? '' : (extra ?? ''));
  if (!c) failures++;
};

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 4, 25, 9, 0, 0);
const mk = (h: string, created: number, n: number) =>
  buildMonster({ pixelHash: h, aspect: 1.2, number: n, createdAtMs: created, originalUri: 'o', cutUri: 'c', renderMode: 'cut' });

(async () => {
  console.log('— intake gate (free = 1/day) —');
  let s = new MonsterStore(memKV());
  check('first intake allowed', await s.canIntake(t0));
  check('next number starts at 1', (await s.nextNumber()) === 1);
  check('tryConsumeIntake spends the slot', await s.tryConsumeIntake(t0));
  await s.addMonster(mk('d1', t0, await s.nextNumber()), t0);
  check('second intake same day blocked (free)', !(await s.canIntake(t0)));
  check('tryConsumeIntake also blocked when limit reached', !(await s.tryConsumeIntake(t0)));
  check('intake allowed next day', await s.canIntake(t0 + DAY));
  check('next number increments', (await s.nextNumber()) === 2);

  console.log('\n— Pro lifts the daily limit —');
  await s.setPro(true);
  check('pro: intake allowed even same day', await s.canIntake(t0));

  console.log('\n— retention is free for everyone (never view-locked) —');
  const m = mk('d2', t0, 1);
  check('not locked at day 10 (free)', !(await s.isLocked(m, t0 + 10 * DAY, false)));
  check('not locked at day 31 (free) — retention is free', !(await s.isLocked(m, t0 + 31 * DAY, false)));
  check('not locked at day 31 (pro)', !(await s.isLocked(m, t0 + 31 * DAY, true)));

  console.log('\n— syncWorld appends discoveries + is idempotent —');
  s = new MonsterStore(memKV());
  await s.addMonster(mk('d3', t0, 1), t0);
  const before = (await s.all())[0].log.length;
  const r1 = await s.syncWorld(t0 + 7 * DAY);
  const afterFirst = (await s.all())[0].log.length;
  check('log grew after 7 days away', afterFirst > before, `${before}→${afterFirst}`);
  check('syncWorld returns a summary entry', r1.length === 1 && r1[0].summaryText !== undefined);
  // opening again immediately should not duplicate the same-day entries
  const r2 = await s.syncWorld(t0 + 7 * DAY);
  const afterSecond = (await s.all())[0].log.length;
  check('idempotent: no duplicate log entries on re-open', afterSecond === afterFirst, `${afterFirst}→${afterSecond}`);

  console.log('\n— welcome persists across same-day re-open (the re-nav bug) —');
  s = new MonsterStore(memKV());
  await s.addMonster(mk('d4', t0, 1), t0);
  await s.syncWorld(t0 + 7 * DAY);            // new day → generates + sets welcome
  const w1 = await s.getWelcome();
  check('welcome set after a day away', w1.length >= 1, w1);
  await s.syncWorld(t0 + 7 * DAY);            // same-day re-open (re-nav) → no-op
  const w2 = await s.getWelcome();
  check('welcome STILL there after same-day re-open', w2.length === w1.length);
  await s.clearWelcome();
  check('welcome cleared on dismiss', (await s.getWelcome()).length === 0);
  // next calendar day with no monster activity still does not crash
  const r3 = await s.syncWorld(t0 + 8 * DAY);
  check('next-day sync returns monsters', r3.length === 1);

  console.log('\n— syncWorld injects sibling names so なかよし can fire —');
  s = new MonsterStore(memKV());
  await s.addMonster(mk('sa', t0, 1), t0);
  await s.addMonster(mk('sb', t0, 2), t0);
  const synced = await s.syncWorld(t0 + 40 * DAY);
  const allEntries = (await s.all()).flatMap((m) => m.log);
  const friend = allEntries.filter((e) => (e as any).kind === 'なかよし');
  const names = (await s.all()).map((m) => m.card.name);
  check('なかよし entries reference an existing monster name',
    friend.length === 0 || friend.every((e) => names.some((n) => e.text.includes(n))));
  check('syncWorld still returns one result per monster', synced.length === 2);

  console.log('\n— welcome carries bond level —');
  s = new MonsterStore(memKV());
  await s.addMonster(mk('wl', t0, 1), t0);
  await s.syncWorld(t0 + 50 * DAY); // long enough to raise bond level
  const wlist = await s.getWelcome();
  check('welcome has a numeric level', wlist.length === 0 || typeof (wlist[0] as any).level === 'number');

  console.log('\n— remove() deletes a monster from the dex —');
  s = new MonsterStore(memKV());
  await s.addMonster(mk('rm1', t0, 1), t0);
  await s.addMonster(mk('rm2', t0, 2), t0);
  check('two monsters before remove', (await s.all()).length === 2);
  await s.remove('rm1');
  const after = await s.all();
  check('one monster after remove', after.length === 1 && after[0].id === 'rm2');
  check('remove of missing id is a no-op', (await s.remove('nope'), (await s.all()).length === 1));

  console.log('\n' + (failures === 0 ? '✅ ALL STORE CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
})();
