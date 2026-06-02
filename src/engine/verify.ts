// Determinism + sanity verification for the on-device engine (run on Windows
// with `npx tsx src/engine/verify.ts`). This is the unit gate ENGINE_SPEC §8
// asks for: "whileAwayEvents が純粋関数（同入力→同出力）".

import { buildMonster, whileAwayEvents, weatherForDay, WEATHER_LABEL, timeOfDay } from './index';

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}`, extra ?? '');
  }
}

const DAY = 86_400_000;
const created = Date.UTC(2026, 4, 25, 9, 0, 0); // 2026-05-25
const pixelHash = 'abc123drawing';

console.log('— buildMonster determinism —');
const m1 = buildMonster({ pixelHash, aspect: 1.3, number: 42, createdAtMs: created, originalUri: 'file://o.png', cutUri: 'file://c.png', renderMode: 'cut' });
const m2 = buildMonster({ pixelHash, aspect: 1.3, number: 42, createdAtMs: created, originalUri: 'file://o.png', cutUri: 'file://c.png', renderMode: 'cut' });
check('same input → identical monster', JSON.stringify(m1) === JSON.stringify(m2));
check('different pixelHash → different seed', m1.seed !== buildMonster({ ...{ pixelHash: 'other', aspect: 1.3, number: 42, createdAtMs: created, originalUri: 'x', cutUri: 'y', renderMode: 'cut' } }).seed);
check('name override consumed', buildMonster({ pixelHash, aspect: 1.3, number: 42, createdAtMs: created, originalUri: 'x', cutUri: 'y', renderMode: 'cut', overrideName: 'ポチ' }).card.name === 'ポチ');
check('card has 3 name candidates', m1.card.nameCandidates.length === 3);
check('first log entry seeded', m1.log.length === 1 && m1.log[0].text.includes('はじめて'));

console.log('\n— sample card —');
console.log('  No.' + m1.card.number, '/', m1.card.name, '/', m1.card.diet, '/', m1.card.zone);
console.log('  stats:', JSON.stringify(m1.card.stats));
console.log('  モンずかん:', m1.card.monsterVoice);
console.log('  こども:', m1.card.kidsVoice);
check('no unfilled %SLOT% in monsterVoice', !/%[A-Z]/.test(m1.card.monsterVoice), m1.card.monsterVoice);
check('no unfilled %SLOT% in kidsVoice', !/%[A-Z]/.test(m1.card.kidsVoice), m1.card.kidsVoice);

console.log('\n— real colours (analyze → mapHexToColorWords) —');
import { buildDexCard, deriveAttributes, mapHexToColorWords } from './index';
const words = mapHexToColorWords(['#3a1f4d', '#1c1620', '#c0392b']); // purple, near-black, red
console.log('  hex → words:', JSON.stringify(words));
const attrReal = deriveAttributes('abc123drawing', 0.6, words);
const cardReal = buildDexCard({ number: 1, attributes: attrReal, seed: m1.seed, createdAtMs: created });
console.log('  モンずかん:', cardReal.monsterVoice);
check('real-colour voice has no unfilled slot', !/%[A-Z]/.test(cardReal.monsterVoice), cardReal.monsterVoice);
check('real-colour voice mentions a mapped colour', words.some((w) => cardReal.monsterVoice.includes(w)));
const attrNone = deriveAttributes('xyz', 1.0, []);
const cardNone = buildDexCard({ number: 2, attributes: attrNone, seed: 123, createdAtMs: created });
console.log('  no-colour voice:', cardNone.monsterVoice);
check('no-colour falls back to カラフルな (not カラフルいろの)', cardNone.monsterVoice.includes('カラフルな') && !cardNone.monsterVoice.includes('カラフルいろの'));

console.log('\n— whileAway determinism (5 days away) —');
const lastOpen = created;
const now = created + 5 * DAY;
const args = { monsterId: m1.id, seed: m1.seed, attributes: m1.attributes, card: m1.card, lastOpenMs: lastOpen, nowMs: now, siblingNames: [] };
const a = whileAwayEvents(args);
const b = whileAwayEvents(args);
check('same input → identical events', JSON.stringify(a) === JSON.stringify(b));
check('events within day range', a.newEntries.every((e) => e.dayOrdinal > Math.floor(lastOpen / DAY) && e.dayOrdinal <= Math.floor(now / DAY)));
check('summary is latest entry', a.summary === null || a.summary === a.newEntries[a.newEntries.length - 1]);
check('no unfilled slot in discoveries', a.newEntries.every((e) => !/%[A-Z]/.test(e.text)), a.newEntries.map((e) => e.text));
console.log('  ' + a.newEntries.length + ' discoveries over 5 days:');
a.newEntries.forEach((e) => console.log('   • ' + e.dateLabel + ' ' + e.text));

console.log('\n— more time away → at least as many events (monotonic backlog) —');
const long = whileAwayEvents({ ...args, nowMs: created + 20 * DAY });
check('20 days ≥ 5 days events', long.newEntries.length >= a.newEntries.length, `${long.newEntries.length} vs ${a.newEntries.length}`);

console.log('\n— weather determinism —');
const w1 = weatherForDay(now);
const w2 = weatherForDay(now);
check('same day → same weather', w1 === w2);
console.log('  weather@now:', w1, '(' + WEATHER_LABEL[w1] + ')  timeOfDay:', timeOfDay(now));

console.log('\n' + (failures === 0 ? '✅ ALL ENGINE CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
process.exit(failures === 0 ? 0 : 1);
