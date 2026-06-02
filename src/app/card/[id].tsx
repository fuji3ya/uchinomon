import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Monster } from '../../engine/types';
import { monsterStore } from '../../engine/monster-store';
import { C, RADIUS, SHADOW } from '../../theme/tokens';

export default function CardDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [m, setM] = useState<Monster | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await monsterStore.all();
        setM(all.find((x) => x.id === decodeURIComponent(id ?? '')) ?? null);
      } catch {
        setM(null);
      }
    })();
  }, [id]);

  if (!m) {
    return (
      <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.dim}>よみこみ中…</Text></View></SafeAreaView>
    );
  }

  const cutUri = m.renderMode === 'paper' ? m.originalUri : m.cutUri ?? m.originalUri;
  const num = String(m.card.number).padStart(3, '0');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}><Text style={styles.backIcon}>‹</Text></Pressable>
        <Text style={styles.navTitle}>ずかん</Text>
        <Text style={styles.navPage}>No.{num}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardNum}>No.{num}</Text>
            <View style={styles.attrRow}>
              <Text style={styles.attr}>{m.card.diet}</Text>
              <Text style={styles.attr}>{m.card.zone}</Text>
            </View>
          </View>

          <View style={styles.visuals}>
            <View style={styles.vbox}>
              <Text style={styles.vlabel}>げんが</Text>
              <View style={styles.paperBg}><Image source={{ uri: m.originalUri }} style={styles.vart} contentFit="contain" /></View>
            </View>
            <View style={styles.vbox}>
              <Text style={styles.vlabel}>うごく</Text>
              <View style={[styles.animBg, m.renderMode === 'paper' && styles.paperBg]}>
                <Image source={{ uri: cutUri }} style={styles.vart} contentFit="contain" />
              </View>
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{m.card.name}</Text>
            <Text style={styles.date}>{m.card.discoveredDateLabel}</Text>
          </View>

          <View style={styles.vMon}>
            <Text style={styles.vMonHead}>モンずかん</Text>
            <Text style={styles.vMonText}>{m.card.monsterVoice}</Text>
            <View style={styles.statRow}>
              <Stat label="たかさ" value={`${m.card.stats.heightM} m`} />
              <Stat label="おもさ" value={`${m.card.stats.weightKg} kg`} />
              <Stat label="すきなもの" value={m.card.stats.favorite} />
            </View>
          </View>

          <View style={styles.vKids}>
            <Text style={styles.vKidsHead}>こどもと よむ かいせつ</Text>
            <Text style={styles.vKidsText}>{m.card.kidsVoice}</Text>
          </View>

          <View style={styles.log}>
            <Text style={styles.logHead}>はっけんログ（るすちゅうに ふえる）</Text>
            {m.log.map((e, i) => (
              <View key={i} style={styles.logItem}>
                <View style={styles.logDot} />
                <Text style={styles.logText}>{e.dateLabel} {e.text}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.keep} onPress={() => router.push('/parent-gate')}>
            <View style={styles.keepIcon}><Text style={{ fontSize: 18 }}>🔖</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.keepTitle}>このカードを ずっと のこす</Text>
              <Text style={styles.keepSub}>おとなの かたへ（Face ID）</Text>
            </View>
            <Text style={styles.keepChevron}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fbeede' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { color: C.mutedInk },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  backIcon: { fontSize: 26, color: C.ink, marginTop: -3 },
  navTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  navPage: { fontSize: 12, color: C.muted, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 28 },
  card: { backgroundColor: C.card, borderRadius: RADIUS.card, overflow: 'hidden', ...SHADOW.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#ffe9f0' },
  cardNum: { fontWeight: '800', color: C.accentDeep, fontSize: 13 },
  attrRow: { flexDirection: 'row', gap: 6 },
  attr: { backgroundColor: '#fff', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3, fontSize: 10.5, fontWeight: '800', color: '#7a6a98', overflow: 'hidden' },
  visuals: { flexDirection: 'row', gap: 10, padding: 14 },
  vbox: { flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  vlabel: { position: 'absolute', top: 7, left: 7, zIndex: 2, backgroundColor: 'rgba(43,37,64,.72)', color: '#fff', fontSize: 9.5, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7, overflow: 'hidden' },
  paperBg: { flex: 1, aspectRatio: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  animBg: { flex: 1, aspectRatio: 1, backgroundColor: '#3a3566', alignItems: 'center', justifyContent: 'center' },
  vart: { width: '88%', height: '88%' },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 16, paddingTop: 6 },
  name: { fontSize: 21, fontWeight: '800', color: C.ink },
  date: { fontSize: 11, color: C.muted, fontWeight: '700', marginLeft: 'auto' },
  vMon: { margin: 16, marginBottom: 0, borderRadius: 16, padding: 14, backgroundColor: '#3a3566' },
  vMonHead: { fontSize: 11, fontWeight: '800', color: C.gold, letterSpacing: 0.6, marginBottom: 7 },
  vMonText: { fontSize: 13, lineHeight: 21, color: '#f3eeff' },
  statRow: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.12)' },
  stat: {},
  statLabel: { fontSize: 11, color: '#c9c0e8' },
  statValue: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 1 },
  vKids: { margin: 16, borderRadius: 16, padding: 14, backgroundColor: '#fff3df', borderWidth: 1, borderColor: '#f3e6cf' },
  vKidsHead: { fontSize: 11, fontWeight: '800', color: C.leaf, marginBottom: 6 },
  vKidsText: { fontSize: 13, lineHeight: 22, color: '#5a5040' },
  log: { marginHorizontal: 16, backgroundColor: '#fff7e6', borderWidth: 1, borderColor: '#e8c878', borderStyle: 'dashed', borderRadius: 14, padding: 12 },
  logHead: { fontSize: 11, color: '#b98a2e', fontWeight: '800', marginBottom: 7 },
  logItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 5 },
  logDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginTop: 5 },
  logText: { flex: 1, fontSize: 11.5, color: '#7a6a48', lineHeight: 16 },
  keep: { flexDirection: 'row', alignItems: 'center', gap: 11, margin: 16, backgroundColor: '#ffeccb', borderWidth: 1, borderColor: '#e8c878', borderStyle: 'dashed', borderRadius: 15, padding: 13 },
  keepIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#ffce63', alignItems: 'center', justifyContent: 'center' },
  keepTitle: { fontSize: 13.5, color: C.goldDeep, fontWeight: '800' },
  keepSub: { fontSize: 11, color: '#a78a52', marginTop: 2 },
  keepChevron: { fontSize: 22, color: '#cdb178', fontWeight: '800' },
});
