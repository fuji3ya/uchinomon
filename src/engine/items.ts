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
