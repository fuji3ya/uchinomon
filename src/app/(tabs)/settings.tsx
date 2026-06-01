import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { monsterStore } from '../../engine/store.native';
import { C, RADIUS, SHADOW } from '../../theme/tokens';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pro, setPro] = useState(false);

  useFocusEffect(
    useCallback(() => {
      monsterStore.isPro().then(setPro).catch(() => setPro(false));
    }, []),
  );

  return (
    <ScrollView style={[styles.screen, { paddingTop: insets.top + 8 }]} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.title}>せってい</Text>

      <View style={styles.card}>
        <Text style={styles.planLabel}>いまの プラン</Text>
        <Text style={styles.planValue}>{pro ? 'うちのモン Pro' : 'むりょう'}</Text>
        {!pro && (
          <Pressable style={styles.upgrade} onPress={() => router.push('/parent-gate')}>
            <Text style={styles.upgradeText}>Pro を みてみる（おとなの かた）</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHead}>プライバシー</Text>
        <Text style={styles.privacy}>
          お子さまの えと なまえは、うちのモンの サーバーには おくりません。すべて この端末の中で しょりされます。
        </Text>
      </View>

      <Row label="あそびかた" onPress={() => {}} />
      <Row label="このアプリについて" onPress={() => {}} />
    </ScrollView>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper, paddingHorizontal: 18 },
  title: { fontSize: 24, fontWeight: '800', color: C.ink, marginBottom: 12 },
  card: { backgroundColor: C.card, borderRadius: RADIUS.card, padding: 16, marginBottom: 12, ...SHADOW.soft },
  planLabel: { fontSize: 12, color: C.mutedInk, fontWeight: '700' },
  planValue: { fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 2 },
  upgrade: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  upgradeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sectionHead: { fontSize: 13, fontWeight: '800', color: C.inkSoft, marginBottom: 6 },
  privacy: { fontSize: 12.5, color: '#6c6480', lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: RADIUS.btn, padding: 16, marginBottom: 10, ...SHADOW.soft },
  rowLabel: { fontSize: 15, fontWeight: '700', color: C.ink },
  rowChevron: { fontSize: 22, color: C.muted, fontWeight: '800' },
});
