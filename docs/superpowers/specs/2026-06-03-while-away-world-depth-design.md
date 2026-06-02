# Spec — 留守中の世界を深く（Phase 1: while-away world depth）

- Date: 2026-06-03
- Status: APPROVED (design GO 2026-06-03)
- Scope: うちのモン Phase 1 of a 4-phase quality push (1 while-away engine → 2 living home → 3 dex cards → 4 birth reveal). This spec covers Phase 1 only.

## Goal

今の留守中エンジンは「1日1回・55%確率で発見テキストを1行追加、種別は1種類」だけ。
これを深くして「また開きたい」を最大化する。具体的には4つを足す:

1. イベント種別（typed events）
2. もちかえり品（コレクション）
3. なかよし度（成長）
4. ミニ物語（連続イベント／arc）

## Architecture decision (ADR)

**採用: 純決定論・導出方式（Approach A）。** なかよし度・おみやげ・arc は新しい保存状態を増やさず、
`(seed, dayOrdinal, その日のイベント)` から毎回計算で導出する。

- 却下: Approach B（なかよしカウンタ・在庫を実際に保存して加算）。理由: セーブ破損リスク、
  マイグレーション負担、テストが重い、今の純設計を壊す。
- 不変条件: エンジンに `Date.now` / `Math.random` を入れない（決定論を壊す唯一の禁則）。
  時刻は呼び出し側が `nowMs` で注入。乱数は `makeRng(mixSeed(...))` のみ。
- ネットワーク・LLM・サーバーは runtime で一切使わない（COPPA: 子どものデータを端末外に出さない）。
- 既存の保存は `monster.log`（DiscoveryEntry[]）のみで足りる。bond/items は log から導出。

## ① イベント種別（typed events）

毎日の発見を、重み付き抽選で種別を選ぶ形にする。

| kind | 内容 | 参照するデータ |
|---|---|---|
| `たべた` | favorite を食べた | `card.stats.favorite` |
| `ひるね` | 休んだ | — |
| `ぼうけん` | 既存の発見プール | `DISCOVERIES_COMMON` + category別 |
| `おみやげ` | item を拾って帰る | ITEMS プール（②へ） |
| `てんき` | その日の天気に連動 | `weatherForDay(dayMs)`（雪→ゆきだるま, 雨→みずたまり, にじ→にじを見た, おまつり→おまつり） |
| `なかよし` | 他のモンスターと遊んだ | sibling 名のリスト（呼び出し側から注入） |

- `DiscoveryEntry` に `kind: DiscoveryKind` と任意 `itemId?: string` を追加。`text` は今まで通り埋める。
- 重み: ぼうけん高め、てんき/なかよし/おみやげ中、ひるね低め（vocab に定数で持つ）。
- `なかよし` は他モンスターが居ないとき（1匹だけ）は抽選から除外し別 kind に再ロール。
- `てんき` の特殊天気（にじ/おまつり/雪/雨）が無い晴れ日は、`てんき` を引いても通常の晴れ向け文に落とす。

## ② もちかえり品（コレクション・導出）

- `deriveItems(monster, nowMs): OwnedItem[]` — log を走査し `kind==='おみやげ'` の itemId を集計。
  `OwnedItem = { item: Item; count: number; firstDayOrdinal: number }`。保存は増やさない。
- `Item = { id: string; name: string; rarity: 'common' | 'rare' | 'legend' }`。
- ITEMS プール（vocab）: きのみ / きれいないし / おはな / まつぼっくり / きらきらのかけら（legend）等。
  rarity で抽選重みを変える（legend は低確率）。
- 絵文字は使わない（anti-flat ルール）。エンジンは id と JP 名と rarity だけ。アイコンは Phase 3 で実画像。

## ③ なかよし度（成長・導出）

- `deriveBond(monster, nowMs): Bond` — `Bond = { points: number; level: number; title: string }`。
- points = `経過日数` + `(なかよし + たべた イベント数) * 重み`。**時間に対して単調非減少**（必ず育つ）。
- level/title 閾値（例）: `0..→であったばかり / N1..→なかよし / N2..→だいすき / N3..→しんゆう`。閾値は vocab 定数。
- level により「おかえり」メッセージのトーンが温かくなる（welcome 文テンプレを level で出し分け）。

## ④ ミニ物語（arc・連続イベント）

- たまに「arc」開始（低確率、通常イベント日にのみ判定）。開始すると N 日（例3）かけて順次進む。
- arc データ: `Arc = { id: string; days: string[] }`（例 やまのぼり: ["やまへ むかった","ちょうじょうを めざした","ちょうじょうに ついた！"]）。
- 制約:
  - 同時に走る arc は1本だけ。arc 中の日はランダムイベントの代わりに arc の順次テキストを出す。
  - arc は途中で別 arc を開始しない。arc 完了後、クールダウン（数日）を挟んでから次の arc 判定。
  - 決定論: `whileAwayEvents` は firstDay→endDay を順に回す純ループ。arc 状態は**そのループ内のローカル変数**で持つ
    （開いた時に毎回フル replay されるので、保存不要で同じ結果になる）。
  - arc 最終日はその arc の完了 entry を `summary` に昇格させ、welcome カードで「ぼうけんから かえってきた」を強める。

## ⑤ 見せ方（Phase 1 は最小）+ 検証 + 触るファイル

### 見せ方（Phase 1 minimal — リッチ化は Phase 2/3）
- おかえりカード / 図鑑ログ: 既存テキスト経路でそのまま流れる（kind が増えた分、文面が多彩になる）。
- 図鑑カード詳細（`card/[id].tsx`）に最小追加: 「なかよし: <title>」と「おみやげ: <n>こ」。
- bond level で welcome 文テンプレを出し分け。

### 検証（`verify.ts` / `verify-store.ts` に追加、node で実行: `npx tsx`）
- 同 `(seed, day)` → 同イベント（kind/itemId/text すべて一致）。
- arc は順番通りに、重複なく、1本ずつ出る（途中割り込み無し）。
- bond.points が時間に対して単調非減少。title が閾値で正しく昇格。
- `deriveItems` の集合・count が replay に対し安定（同じ now で2回呼んで一致）。
- エンジン層に `Date.now` / `Math.random` の grep ヒットが無い（CI 前にローカル grep）。
- `tsc --noEmit` が exit 0。

### 触るファイル
- `src/engine/whileAway.ts` — typed events + arc + weather/sibling-aware 生成。
- `src/engine/types.ts` — `DiscoveryKind`, `DiscoveryEntry.kind/itemId`, `Item`, `OwnedItem`, `Bond`。
- `src/engine/bond.ts`（新規）— `deriveBond`。
- `src/engine/items.ts`（新規）— `deriveItems`。
- `src/data/vocab.ts` — `ITEMS`, kind別テンプレ, `ARCS`, kind重み, bond閾値/称号, level別welcome文。
- `src/engine/index.ts` — 新規 export。
- `src/engine/store.ts` — `syncWorld` が sibling 名リスト（と weather 関数）を generator に渡す。
- `src/app/card/[id].tsx` — なかよし称号 + おみやげ数の最小表示。
- `src/engine/verify.ts` / `verify-store.ts` — 上記検証。

## Out of scope (Phase 1 ではやらない)
- home のリビング演出（Phase 2）。
- 図鑑カードのビジュアル豪華化・成長ステージ表示（Phase 3）。
- 誕生演出（Phase 4）。
- item / bond のリッチな専用画面（最小テキスト表示のみ。専用 UI は後フェーズ）。

## Risks / mitigations
- arc のループ内状態管理ミスで非決定論化 → verify で「2回 replay 一致」を必ず通す。
- vocab 肥大で日本語が不自然 → 既存方針通り Gemma4 でアイデア出し→手キュレーション、ひらがな中心・kid-safe。
- card 詳細の最小表示が dead field 化（取得して表示されない）→ data-captured≠consumed ルールで、
  deriveBond/deriveItems の戻り値が実際に画面に出るまでを verify/実機で確認。
