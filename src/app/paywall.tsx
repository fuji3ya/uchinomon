import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { monsterStore } from '../engine/monster-store';
import { C, RADIUS, SHADOW } from '../theme/tokens';

// NOTE: real purchases are wired in task #13 (RevenueCat). For now the buttons
// flip the local Pro flag so the unlock flow is testable end-to-end on TestFlight.
const BENEFITS = [
  'おえかきを むせいげんに とりこめる',
  'ずかんカードが ずっと のこる（30日で きえない）',
  'はっけんログが ずっと ふえつづける',
];

export default function Paywall() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function purchasePro() {
    setBusy(true);
    await monsterStore.setPro(true); // TODO(#13): RevenueCat purchase
    router.replace('/purchase-success');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeWrap}><Text style={styles.close}>✕</Text></Pressable>

        <Text style={styles.title}>うちのモン Pro</Text>
        <Text style={styles.lead}>おもいでを ずっと のこして、どうぶつえんを そだてよう。</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefit}>
              <Text style={styles.benefitCheck}>✓</Text>
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.planMain, busy && { opacity: 0.6 }]} onPress={purchasePro} disabled={busy}>
          <Text style={styles.planMainTitle}>Pro（かいきり）</Text>
          <Text style={styles.planMainPrice}>¥1,000（1かいだけ）</Text>
        </Pressable>

        <Text style={styles.privacy}>
          お子さまの えと なまえは、うちのモンの サーバーには おくりません。すべて この端末の中で しょりされます。
        </Text>
        <Text style={styles.legal}>1かいの おしはらいで ずっと つかえます（つきがくでは ありません）。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.nightTop },
  body: { padding: 24, paddingTop: 16, gap: 14 },
  closeWrap: { alignSelf: 'flex-end' },
  close: { fontSize: 22, color: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 6 },
  lead: { fontSize: 14, color: '#d9d2e6', lineHeight: 21 },
  benefits: { gap: 10, marginTop: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitCheck: { width: 24, height: 24, textAlign: 'center', lineHeight: 24, borderRadius: 12, backgroundColor: C.leaf, color: '#fff', fontWeight: '900', overflow: 'hidden' },
  benefitText: { flex: 1, fontSize: 14.5, color: '#fff', fontWeight: '600' },
  planMain: { backgroundColor: C.accent, borderRadius: RADIUS.card, padding: 18, alignItems: 'center', marginTop: 14, ...SHADOW.card },
  planMainTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  planMainPrice: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  privacy: { fontSize: 12, color: '#b1aac0', lineHeight: 18, marginTop: 10 },
  legal: { fontSize: 11, color: '#8a8298', lineHeight: 16 },
});
