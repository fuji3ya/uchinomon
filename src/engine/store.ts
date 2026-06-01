// Monster persistence + free/Pro boundaries (ENGINE_SPEC §6, §7).
// Storage is injected so the pure logic (next dex number, daily intake limit,
// 30-day view-lock) is unit-testable on node; the RN app supplies an
// AsyncStorage-backed adapter (store.native.ts).

import { whileAwayEvents } from './whileAway';
import type { Monster } from './types';

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const K_MONSTERS = 'uchinomon.monsters.v1';
const K_LASTOPEN = 'uchinomon.lastOpen.v1';
const K_INTAKE = 'uchinomon.intake.v1'; // {"day":<ordinal>,"count":<n>}
const K_PRO = 'uchinomon.pro.v1';

const DAY = 86_400_000;
const FREE_DAILY_INTAKE = 1;
const FREE_EXPIRE_DAYS = 30;

export class MonsterStore {
  constructor(private kv: KV) {}

  async all(): Promise<Monster[]> {
    const raw = await this.kv.get(K_MONSTERS);
    return raw ? (JSON.parse(raw) as Monster[]) : [];
  }

  private async save(list: Monster[]): Promise<void> {
    await this.kv.set(K_MONSTERS, JSON.stringify(list));
  }

  async isPro(): Promise<boolean> {
    return (await this.kv.get(K_PRO)) === '1';
  }

  async setPro(on: boolean): Promise<void> {
    await this.kv.set(K_PRO, on ? '1' : '0');
  }

  async nextNumber(): Promise<number> {
    const list = await this.all();
    return list.reduce((mx, m) => Math.max(mx, m.card.number), 0) + 1;
  }

  // Daily intake gate. Pro = unlimited. Free = 1/day. The count is only spent on
  // confirmed intake (addMonster), matching capture-choice's "きょうの1ぴきはへらない".
  async canIntake(nowMs: number): Promise<boolean> {
    if (await this.isPro()) return true;
    const today = Math.floor(nowMs / DAY);
    const raw = await this.kv.get(K_INTAKE);
    const rec = raw ? (JSON.parse(raw) as { day: number; count: number }) : { day: today, count: 0 };
    if (rec.day !== today) return true;
    return rec.count < FREE_DAILY_INTAKE;
  }

  async addMonster(m: Monster, nowMs: number): Promise<void> {
    const list = await this.all();
    list.push(m);
    await this.save(list);
    const today = Math.floor(nowMs / DAY);
    const raw = await this.kv.get(K_INTAKE);
    const rec = raw ? (JSON.parse(raw) as { day: number; count: number }) : { day: today, count: 0 };
    const count = rec.day === today ? rec.count + 1 : 1;
    await this.kv.set(K_INTAKE, JSON.stringify({ day: today, count }));
  }

  // View-lock (NOT delete) for free users after 30 days (ENGINE_SPEC §7:
  // "expire は削除ではなく閲覧ロック"). Pro / one-time-purchased stay unlocked.
  async isLocked(m: Monster, nowMs: number, pro: boolean): Promise<boolean> {
    if (pro || (m as Monster & { keptForever?: boolean }).keptForever) return false;
    return nowMs - m.createdAtMs > FREE_EXPIRE_DAYS * DAY;
  }

  // Run the while-away simulation for every monster since last open, append new
  // discoveries, persist, and return the per-monster "welcome back" summaries.
  async syncWorld(nowMs: number): Promise<{ monster: Monster; summaryText: string | null }[]> {
    const list = await this.all();
    const lastRaw = await this.kv.get(K_LASTOPEN);
    // 0 = never opened before → simulate each monster's backlog since its own
    // creation (capped by MAX_DAYS in whileAwayEvents).
    const lastOpen = lastRaw ? Number(lastRaw) : 0;
    const out: { monster: Monster; summaryText: string | null }[] = [];

    for (const m of list) {
      const res = whileAwayEvents({
        monsterId: m.id, seed: m.seed, attributes: m.attributes, card: m.card,
        // a monster never has events before it existed
        lastOpenMs: Math.max(lastOpen, m.createdAtMs), nowMs,
      });
      // append only entries not already logged (idempotent on repeated opens)
      const seen = new Set(m.log.map((e) => e.dayOrdinal + '|' + e.text));
      for (const e of res.newEntries) {
        if (!seen.has(e.dayOrdinal + '|' + e.text)) m.log.push(e);
      }
      out.push({ monster: m, summaryText: res.summary?.text ?? null });
    }

    await this.save(list);
    await this.kv.set(K_LASTOPEN, String(nowMs));
    return out;
  }
}
