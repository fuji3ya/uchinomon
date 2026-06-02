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
