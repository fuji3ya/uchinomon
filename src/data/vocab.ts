// Hand-curated, kid-safe Japanese vocabulary pools (ENGINE_SPEC §2.2).
// All strings reviewed for appropriateness; no LLM, no network. Determinism +
// curation guarantees no hallucination / no inappropriate words reach children.

import type { Category } from '../engine/types';

// Name candidates by category. The kid can override at onboarding step 3.
export const NAME_PARTS: Record<Category, { heads: string[]; tails: string[] }> = {
  きょうりゅう: { heads: ['にじ', 'ガオ', 'ドコ', 'プク', 'トゲ', 'ノッシ'], tails: ['ザウルス', 'ドン', 'ラプト', 'サウラ'] },
  いきもの: { heads: ['もこ', 'ぽよ', 'ふわ', 'まる', 'こてつ', 'たぬ'], tails: ['っち', 'ぴー', 'もん', 'たん'] },
  とり: { heads: ['ピヨ', 'そら', 'ふわ', 'くる'], tails: ['っぴ', 'バード', 'りん', 'ぽっぽ'] },
  むし: { heads: ['ブブ', 'カサ', 'ちょこ', 'てんと'], tails: ['むし', 'りん', 'ぴょん'] },
  うみのいきもの: { heads: ['ぷか', 'ゆら', 'なみ', 'みず'], tails: ['くらげ', 'っち', 'ぽん'] },
  のりもの: { heads: ['ブーン', 'ガタ', 'ピカ', 'はや'], tails: ['ごう', 'カー', 'まる'] },
  ふしぎ: { heads: ['ふわ', 'きら', 'もや', 'なぞ'], tails: ['もん', 'っち', 'りん'] },
};

export const PERSONALITIES = [
  'げんき', 'おっとり', 'やんちゃ', 'はずかしがり', 'なかよし', 'まいぺーす', 'がんばりや', 'のんびり',
] as const;

export const FOODS = ['はっぱ', 'きのみ', 'おはな', 'ほし', 'にじ', 'くさ', 'まめ', 'ゼリー', 'きらきらの石'] as const;

export const CRIES = ['がおー', 'ぴゅい', 'もふ', 'ぷくー', 'きゅい', 'ぶぶー', 'ふわー'] as const;

export const COLOR_WORDS = [
  'みどり', 'あお', 'あか', 'きいろ', 'むらさき', 'ピンク', 'みずいろ', 'だいだい', 'にじいろ', 'しろ', 'ちゃいろ',
] as const;

// Discovery events that accrete while the kid is away (ENGINE_SPEC §4).
// %N% = monster name, %FOOD% = favorite food, %COLOR% = a main color.
export const DISCOVERIES_COMMON = [
  'よるの たんけんで きらきらの石を ひろった',
  'おひるねを たっぷり したらしい',
  'おにわで %FOOD% を みつけて よろこんでいた',
  'みずたまりに うつった じぶんを みて くびを かしげた',
  'はっぱの ベッドで まるくなって ねむっていた',
  'ちいさな ともだちと かけっこを した',
  'あさひに むかって 「%CRY%」と ないた',
  '%COLOR%の はなを かざりに していた',
] as const;

export const DISCOVERIES_BY_CATEGORY: Partial<Record<Category, string[]>> = {
  きょうりゅう: ['はしると ツノが ひかることが わかった', 'おおきな あしあとを のこして あるいた'],
  とり: ['たかい きの てっぺんまで とんでいった', 'くもの うえで ひとやすみ していた'],
  うみのいきもの: ['みずの なかで くるくる おどっていた', 'なみに のって とおくまで いった'],
  むし: ['はっぱの うらで かくれんぼ していた', 'つゆを のんで げんきに なった'],
  のりもの: ['にじの みちを はしりぬけた', 'みんなを のせて おさんぽ した'],
};

// ③ monster-zukan voice (figurative/dex tone). %COLOR% is a full phrase that
// already ends with "いろの" (or "カラフルな"); only real colour + size are
// asserted, the rest is whimsical fantasy. No literal category / horn claims.
export const MONSTER_VOICE_TEMPLATES = [
  '%ZONE%で みつかった、%COLOR% %SIZE% いきもの。%FOOD%が だいすきで、きげんが いいと しっぽを ふって「%CRY%」と なくらしい。',
  '%COLOR% %SIZE% からだの ふしぎな いきもの。%ZONE%に すみ、%FOOD%が だいすき。%PERSONA%な せいかくで、よく「%CRY%」と なく。',
] as const;

// ④ kids voice (gentle, read-with-child tone).
export const KIDS_VOICE_TEMPLATES = [
  '%COLOR% %SIZE% いきものだよ。とっても %PERSONA%で、%ZONE_SHORT%で あそぶのが だいすき。%FOOD%を もぐもぐ たべるんだって。',
  '%COLOR% かわいい いきものだよ。%FOOD%が すきで、%PERSONA%な おともだち。きょうも げんきに「%CRY%」って ないているよ。',
] as const;
