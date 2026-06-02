import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, BOTTOM_BAR_HEIGHT } from '../components/bottom-bar';
import { WEATHER_LABEL, weatherForDay } from '../engine';
import { monsterStore } from '../engine/monster-store';
import type { Monster } from '../engine/types';
import { BG_SOURCE } from '../theme/backgrounds';
import { C, RADIUS, SHADOW } from '../theme/tokens';

const WEATHER_PHRASE: Record<string, string> = {
  morning: 'あさの ひかり', noon: 'はれた ひる', dusk: 'ゆうやけ', night: 'まんげつの よる',
  rain: 'しとしと あめ', snow: 'しんしん ゆき', rainbow: 'にじが でた', festival: 'おまつりの ひ',
};

export default function LivingZoo() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [monsters, setMonsters] = useState<Monster[] | null>(null);
  const [welcome, setWelcome] = useState<{ name: string; text: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const weather = weatherForDay(Date.now());

  const load = useCallback(async () => {
    try {
      const results = await monsterStore.syncWorld(Date.now());
      setMonsters(results.map((r) => r.monster));
      // welcome is persisted in the store so it survives Home re-navigation
      setWelcome(await monsterStore.getWelcome());
    } catch (e: any) {
      setMonsters([]);
      setErr(e?.message ?? String(e));
    }
  }, []);

  async function dismissWelcome() {
    await monsterStore.clearWelcome();
    setWelcome([]);
  }

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground source={BG_SOURCE[weather]} style={styles.bg} resizeMode="cover">
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Text style={styles.brand}>うちのどうぶつえん</Text>
          <View style={styles.weatherChip}><Text style={styles.weatherText}>{WEATHER_PHRASE[weather] ?? WEATHER_LABEL[weather]}</Text></View>
        </View>

        {err && (
          <View style={[styles.welcomeCard, { backgroundColor: '#ffe3ec' }]}>
            <Text selectable style={{ fontSize: 12, color: '#b3245e', fontWeight: '700' }}>起動エラー（捕捉済）: {err}</Text>
          </View>
        )}
        {welcome.length > 0 && (
          <View style={styles.welcomeCard}>
            <Pressable onPress={dismissWelcome} hitSlop={10} style={styles.welcomeClose}>
              <Text style={styles.welcomeCloseText}>✕</Text>
            </Pressable>
            <Text style={styles.welcomeTitle}>
              {welcome[0].name}
              {welcome.length > 1 ? ` ほか ${welcome.length - 1}ぴき` : ''}が ぼうけんから かえってきたよ
            </Text>
            {welcome.slice(0, 3).map((w, i) => (
              <View key={i} style={styles.giftRow}>
                <View style={styles.giftDot} />
                <Text style={styles.giftText}>{welcome.length > 1 ? `${w.name}: ` : ''}{w.text}</Text>
              </View>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={[styles.scene, { paddingBottom: BOTTOM_BAR_HEIGHT + 16 }]} showsVerticalScrollIndicator={false}>
          {monsters === null ? null : monsters.length === 0 ? (
            <EmptyZoo onAdd={() => router.push('/capture')} />
          ) : (
            <View style={styles.meadow}>
              {monsters.map((m, i) => (
                <MonsterSprite key={m.id} monster={m} index={i} onPress={() => router.push(`/card/${encodeURIComponent(m.id)}`)} />
              ))}
            </View>
          )}
        </ScrollView>
      </ImageBackground>
      <BottomBar active="index" />
    </View>
  );
}

function MonsterSprite({ monster, index, onPress }: { monster: Monster; index: number; onPress: () => void }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 900 + (index % 3) * 180;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: -10, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [y, index]);

  const uri = monster.renderMode === 'paper' ? monster.originalUri : monster.cutUri ?? monster.originalUri;
  return (
    <Pressable onPress={onPress} style={[styles.spriteWrap, { marginTop: (index % 2) * 28 }]}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        <Image source={{ uri }} style={styles.sprite} contentFit="contain" />
      </Animated.View>
      <View style={styles.nameTag}><Text style={styles.nameTagText}>{monster.card.name}</Text></View>
    </Pressable>
  );
}

function EmptyZoo({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>まだ だれも いないよ</Text>
      <Text style={styles.emptyBody}>おえかきを とりこむと、{'\n'}この どうぶつえんで うごきだすよ。</Text>
      <Pressable style={styles.emptyBtn} onPress={onAdd}><Text style={styles.emptyBtnText}>さいしょの 1ぴきを とりこむ</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  brand: { fontSize: 19, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(40,20,60,.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  weatherChip: { backgroundColor: 'rgba(255,255,255,.82)', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, ...SHADOW.soft },
  weatherText: { fontSize: 12, fontWeight: '800', color: C.accentDeep },
  welcomeCard: { marginHorizontal: 16, backgroundColor: 'rgba(255,253,250,.95)', borderRadius: RADIUS.card, padding: 14, paddingRight: 34, ...SHADOW.card },
  welcomeClose: { position: 'absolute', top: 8, right: 10, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  welcomeCloseText: { fontSize: 15, color: C.muted, fontWeight: '800' },
  welcomeTitle: { fontSize: 15, fontWeight: '800', color: C.ink, lineHeight: 22 },
  giftRow: { flexDirection: 'row', gap: 8, marginTop: 8, backgroundColor: '#fff7e6', borderRadius: 12, padding: 10, alignItems: 'flex-start' },
  giftDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold, marginTop: 5 },
  giftText: { flex: 1, fontSize: 12, color: '#7a6a48', lineHeight: 17, fontWeight: '600' },
  scene: { flexGrow: 1, justifyContent: 'flex-end' },
  meadow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', gap: 6, paddingHorizontal: 10 },
  spriteWrap: { alignItems: 'center', width: '32%' },
  sprite: { width: 96, height: 96 },
  nameTag: { backgroundColor: 'rgba(43,37,64,.72)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  nameTagText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(40,20,60,.5)', textShadowRadius: 6 },
  emptyBody: { fontSize: 13.5, color: '#fff', textAlign: 'center', lineHeight: 21, textShadowColor: 'rgba(40,20,60,.5)', textShadowRadius: 5 },
  emptyBtn: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 14, paddingHorizontal: 22, marginTop: 8, ...SHADOW.card },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
