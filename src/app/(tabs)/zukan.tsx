import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Monster } from '../../engine/types';
import { monsterStore } from '../../engine/store.native';
import { C, RADIUS, SHADOW } from '../../theme/tokens';

export default function Zukan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [list, setList] = useState<Monster[]>([]);

  useFocusEffect(
    useCallback(() => {
      monsterStore.all().then(setList).catch(() => setList([]));
    }, []),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>ずかん</Text>
      <Text style={styles.count}>{list.length} ぴき はっけん</Text>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <Text style={styles.empty}>まだ ずかんは からっぽ。{'\n'}「とりこむ」で さいしょの 1ぴきを むかえてね。</Text>
        ) : (
          list.map((m) => {
            const uri = m.renderMode === 'paper' ? m.originalUri : m.cutUri ?? m.originalUri;
            return (
              <Pressable key={m.id} style={styles.cell} onPress={() => router.push(`/card/${encodeURIComponent(m.id)}`)}>
                <View style={styles.thumb}><Image source={{ uri }} style={styles.thumbImg} contentFit="contain" /></View>
                <Text style={styles.cellNum}>No.{String(m.card.number).padStart(3, '0')}</Text>
                <Text style={styles.cellName} numberOfLines={1}>{m.card.name}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper, paddingHorizontal: 18 },
  title: { fontSize: 24, fontWeight: '800', color: C.ink },
  count: { fontSize: 13, color: C.mutedInk, marginTop: 2, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
  empty: { fontSize: 14, color: C.mutedInk, textAlign: 'center', lineHeight: 22, width: '100%', marginTop: 40 },
  cell: { width: '30%', alignItems: 'center' },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: RADIUS.chip, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  thumbImg: { width: '80%', height: '80%' },
  cellNum: { fontSize: 10, color: C.accentDeep, fontWeight: '800', marginTop: 5 },
  cellName: { fontSize: 12, color: C.ink, fontWeight: '700' },
});
