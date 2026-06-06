// Monster persistence + free/Pro boundaries (ENGINE_SPEC §6, §7).
// Storage is injected so the pure logic (next dex number, daily intake limit,
// 30-day view-lock) is unit-testable on node; the RN app supplies an
// AsyncStorage-backed adapter (store.native.ts).

import { deriveBond } from './bond';
import { dayOrdinal } from './seed';
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
const K_WELCOME = 'uchinomon.welcome.v1'; // [{name,text}] pending "おかえり" cards

export type Welcome = { name: string; text: string; level: number };

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

  // Remove a monster from the zoo/dex (user-initiated "さよなら"). Does not touch
  // the daily intake counter (deleting doesn't refund today's slot, matching the
  // "1日1ぴき" promise). Image files are cleaned up by the UI layer.
  async remove(id: string): Promise<void> {
    const list = await this.all();
    await this.save(list.filter((m) => m.id !== id));
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
    const lastOpen = lastRaw ? Number(lastRaw) : 0;

    // Only run the while-away pass when a NEW CALENDAR DAY has begun (or on the
    // very first open). Re-navigating to Home within the same day is a no-op, so
    // the "おかえり" card (persisted separately) is NOT wiped and lastOpen is not
    // churned. Events are deterministic per day, so same-day reruns add nothing.
    const newDay = lastOpen === 0 || dayOrdinal(nowMs) > dayOrdinal(lastOpen);
    if (!newDay) {
      return list.map((m) => ({ monster: m, summaryText: null }));
    }

    const out: { monster: Monster; summaryText: string | null }[] = [];
    const welcomes: Welcome[] = [];
    for (const m of list) {
      const siblingNames = list.filter((o) => o.id !== m.id).map((o) => o.card.name);
      const res = whileAwayEvents({
        monsterId: m.id, seed: m.seed, attributes: m.attributes, card: m.card,
        lastOpenMs: Math.max(lastOpen, m.createdAtMs), nowMs, siblingNames, // never before it existed
      });
      const seen = new Set(m.log.map((e) => e.dayOrdinal + '|' + e.text));
      for (const e of res.newEntries) {
        if (!seen.has(e.dayOrdinal + '|' + e.text)) m.log.push(e);
      }
      out.push({ monster: m, summaryText: res.summary?.text ?? null });
      if (res.summary) welcomes.push({ name: m.card.name, text: res.summary.text, level: deriveBond(m, nowMs).level });
    }

    await this.save(list);
    await this.kv.set(K_LASTOPEN, String(nowMs));
    if (welcomes.length) await this.kv.set(K_WELCOME, JSON.stringify(welcomes));
    return out;
  }

  // Pending "おかえり" cards survive Home re-navigation until dismissed.
  async getWelcome(): Promise<Welcome[]> {
    const raw = await this.kv.get(K_WELCOME);
    return raw ? (JSON.parse(raw) as Welcome[]) : [];
  }
  async clearWelcome(): Promise<void> {
    await this.kv.set(K_WELCOME, '[]');
  }
}
