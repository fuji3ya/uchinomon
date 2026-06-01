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
  await s.addMonster(mk('d1', t0, await s.nextNumber()), t0);
  check('second intake same day blocked (free)', !(await s.canIntake(t0)));
  check('intake allowed next day', await s.canIntake(t0 + DAY));
  check('next number increments', (await s.nextNumber()) === 2);

  console.log('\n— Pro lifts the daily limit —');
  await s.setPro(true);
  check('pro: intake allowed even same day', await s.canIntake(t0));

  console.log('\n— 30-day view-lock (free), unlocked for pro —');
  const m = mk('d2', t0, 1);
  check('not locked at day 10 (free)', !(await s.isLocked(m, t0 + 10 * DAY, false)));
  check('locked at day 31 (free)', await s.isLocked(m, t0 + 31 * DAY, false));
  check('NOT locked at day 31 (pro)', !(await s.isLocked(m, t0 + 31 * DAY, true)));

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

  console.log('\n' + (failures === 0 ? '✅ ALL STORE CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
  process.exit(failures === 0 ? 0 : 1);
})();
