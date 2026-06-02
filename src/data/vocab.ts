// Hand-curated, kid-safe Japanese vocabulary pools (ENGINE_SPEC §2.2).
// All strings human-reviewed (ひらがな中心, 3–6歳向け, no scary/violent/negative
// content). Idea-augmented with the local Gemma4 model OFFLINE, then rewritten
// here for voice + safety — nothing is generated at runtime and no child data is
// ever sent anywhere. Determinism + curation = no hallucination reaches kids.

import type { Category, DiscoveryKind, Item } from '../engine/types';

// Name candidates by category (internal flavour only; category is never printed
// as a literal claim). The kid can override at onboarding / naming.
export const NAME_PARTS: Record<Category, { heads: string[]; tails: string[] }> = {
  きょうりゅう: { heads: ['にじ', 'ガオ', 'ドコ', 'プク', 'トゲ', 'ノッシ', 'ガブ', 'ズン'], tails: ['ザウルス', 'ドン', 'ラプト', 'サウラ', 'ゴン', 'がお'] },
  いきもの: { heads: ['もこ', 'ぽよ', 'ふわ', 'まる', 'こてつ', 'たぬ', 'むく', 'ぷに'], tails: ['っち', 'ぴー', 'もん', 'たん', 'のすけ', 'ちゃん'] },
  とり: { heads: ['ピヨ', 'そら', 'ふわ', 'くる', 'はね', 'ぴゅう'], tails: ['っぴ', 'バード', 'りん', 'ぽっぽ', 'たん'] },
  むし: { heads: ['ブブ', 'カサ', 'ちょこ', 'てんと', 'ころ', 'ぴょん'], tails: ['むし', 'りん', 'ぴょん', 'まる'] },
  うみのいきもの: { heads: ['ぷか', 'ゆら', 'なみ', 'みず', 'ぷよ', 'しお'], tails: ['くらげ', 'っち', 'ぽん', 'なみ'] },
  のりもの: { heads: ['ブーン', 'ガタ', 'ピカ', 'はや'], tails: ['ごう', 'カー', 'まる'] },
  ふしぎ: { heads: ['ふわ', 'きら', 'もや', 'なぞ', 'ぽわ', 'ゆめ', 'ほし', 'みかん'], tails: ['もん', 'っち', 'りん', 'たん', 'ぽん'] },
};

export const PERSONALITIES = [
  'げんき', 'おっとり', 'やんちゃ', 'はずかしがり', 'なかよし', 'まいぺーす', 'がんばりや', 'のんびり',
  'ゆうかん', 'あまえんぼう', 'ねぼすけ', 'ほがらか', 'すなお', 'おちゃめ', 'やさしい', 'まじめ',
] as const;

export const FOODS = [
  'はっぱ', 'きのみ', 'おはな', 'ほし', 'にじ', 'くさ', 'まめ', 'ゼリー', 'きらきらの石', 'あまい みつ',
  'くもの わたあめ', 'つゆ', 'ひかりの つぶ', 'まんまるパン', 'ふわふわの たね', 'おひさまの かけら',
  'きらきらアイス', 'あおい きのみ',
] as const;

export const CRIES = [
  'がおー', 'ぴゅい', 'もふ', 'ぷくー', 'きゅい', 'ぶぶー', 'ふわー', 'ぽよん', 'ぴこぴこ', 'くぅーん',
  'ぱお', 'ふんふん', 'みゃう', 'ぴゅるる',
] as const;

// What the creature loves doing (fills %HABIT%).
export const HABITS = [
  'おさんぽ', 'おひるね', 'かくれんぼ', 'ほしぞらを みること', 'みずあそび', 'たかいところに のぼること',
  'くるくる まわること', 'ひなたぼっこ', 'おかたづけ', 'うたうこと', 'ジャンプ', 'おはなを あつめること',
] as const;

// A whimsical trait — plain verb phrase so it slots into "〜らしい"/"〜。" (fills %SPECIAL%).
export const SPECIALS = [
  'きげんが いいと しっぽを ふる', 'ねむくなると ちいさく ひかる', 'うれしいと くるくる まわる',
  'よるは ほしを かぞえる', 'おいしいものを みつけると とびはねる', 'あさひを あびると げんきになる',
  'きれいな いしを あつめる', 'くもの うえで ひるねする', 'にじを みると よろこぶ',
  'おひさまの においが すき', 'あめのひは とくに げんき', 'おはなを みると にっこりする',
] as const;

export const COLOR_WORDS = [
  'みどり', 'あお', 'あか', 'きいろ', 'むらさき', 'ピンク', 'みずいろ', 'だいだい', 'にじいろ', 'しろ', 'ちゃいろ',
] as const;

// While-away discovery events (ENGINE_SPEC §4). ひらがな, past/様子, peaceful only.
// %FOOD%/%COLOR%/%CRY% slots are filled from the monster's own card.
export const DISCOVERIES_COMMON = [
  'よるの たんけんで きらきらの石を ひろった',
  'ふわふわの くもみたいに おひるね していた',
  'きらきらの ほしを あつめて そらに かざった',
  'おおきな はっぱの うえで のんびり していた',
  'みずたまりで さかなさんと あそんだ',
  'おひさまの ひかりを あびて げんきに なった',
  'もりの おくで ひみつの たからものを みつけた',
  'くもの ともだちと そらで あそんだ',
  'きらきらの すなで おしろを つくった',
  'あまい みつを あつめていた',
  'にじを みつけて じっと みていた',
  '%FOOD%を みつけて とびはねていた',
  '%COLOR%の はなを かざりに していた',
  'ちいさな ともだちと かけっこ した',
  'あさひに むかって 「%CRY%」と ないた',
  'ほしぞらを ながめて うっとり していた',
  'まるい いしを そっと しまっていた',
  'かぜに のって ふわふわ ういていた',
  'おはなの ベッドで まるくなって ねむっていた',
  'きれいな はっぱを あつめていた',
  'みずべで ぱしゃぱしゃ あそんだ',
  'たかい きの うえで ひとやすみ していた',
  'くるくる まわって おどっていた',
  'あまい においの おはなを みつけた',
  'ゆうやけを みて にこにこ していた',
  'ちいさな むしさんと ともだちに なった',
  'きらきらの つゆを のんでいた',
  'おつきさまに ごあいさつ していた',
] as const;

export const DISCOVERIES_BY_CATEGORY: Partial<Record<Category, string[]>> = {
  きょうりゅう: ['おおきな あしあとを のこして あるいた', 'はしると からだが ぽかぽかに なった'],
  とり: ['たかい きの てっぺんまで とんでいった', 'くもの うえで ひとやすみ していた', 'そらの さんぽに でかけた'],
  うみのいきもの: ['みずの なかで くるくる おどっていた', 'なみに のって とおくまで いった'],
  むし: ['はっぱの うらで かくれんぼ していた', 'つゆを のんで げんきに なった'],
  ふしぎ: ['よるに そっと ひかっていた', 'ゆめの なかを さんぽ していた'],
};

// ③ monster-zukan voice. %COLOR% is a full phrase ending in "いろの" (or
// "カラフルな"); only COLOR + SIZE are asserted as visible facts. The rest
// (zone/food/cry/persona/habit/special) is whimsical fantasy.
export const MONSTER_VOICE_TEMPLATES = [
  '%ZONE%で みつかった、%COLOR% %SIZE% いきもの。%FOOD%が だいすきで、%SPECIAL%らしい。',
  '%COLOR% %SIZE% からだの ふしぎな いきもの。%ZONE%に すみ、%HABIT%を このむ。よく「%CRY%」と なく。',
  '%PERSONA%な せいかくの、%COLOR% いきもの。%FOOD%を たべ、%SPECIAL%。',
  '%ZONE%に あらわれた %COLOR% %SIZE% いきもの。%HABIT%が とくいで、ごきげんだと「%CRY%」と なく。',
  '%COLOR% からだの %PERSONA%な いきもの。%FOOD%を さがして %ZONE_SHORT%を おさんぽする。',
  '%SIZE% %COLOR% いきもの。%SPECIAL%。すきな たべものは %FOOD%。',
  '%ZONE%の ぬしと いわれる %COLOR% いきもの。%HABIT%を しながら「%CRY%」と なく。',
  '%COLOR% %SIZE% からだを もつ。%PERSONA%で、%FOOD%と %HABIT%が だいすき。',
] as const;

// ④ kids voice (gentle, read-with-child tone).
export const KIDS_VOICE_TEMPLATES = [
  '%COLOR% %SIZE% いきものだよ。とっても %PERSONA%で、%HABIT%が だいすき。%FOOD%を もぐもぐ たべるんだって。',
  '%COLOR% かわいい いきものだよ。%FOOD%が すきで、%PERSONA%な おともだち。きょうも「%CRY%」って ないているよ。',
  '%COLOR% いきものさん。%SPECIAL%んだって。%ZONE_SHORT%で げんきに あそんでいるよ。',
  'とっても %PERSONA%な %COLOR% いきもの。%HABIT%を していると、しあわせそうだよ。',
  '%COLOR% %SIZE% からだの おともだち。%FOOD%を たべると、「%CRY%」って よろこぶよ。',
  '%ZONE_SHORT%が だいすきな %COLOR% いきもの。%SPECIAL%。みていると ほっこりするね。',
  '%COLOR% いきものだよ。%PERSONA%で、%HABIT%が とくい。きょうも げんきだよ。',
  '%COLOR% かわいい いきもの。%FOOD%と %HABIT%が だいすきなんだって。',
] as const;

// ─── while-away world depth (Phase 1) ───────────────────────────────────────

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
