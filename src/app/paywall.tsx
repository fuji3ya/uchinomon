import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { monsterStore } from '../engine/monster-store';
import { buyPro, configureIAP, getProPackage, iapReady, restorePro } from '../iap';
import { C, RADIUS, SHADOW } from '../theme/tokens';

const BENEFITS = [
  'おえかきを むせいげんに とりこめる',
  'ずかんカードが ずっと のこる（30日で きえない）',
  'はっけんログが ずっと ふえつづける',
];

const NOT_READY = 'ストアに せつぞく できませんでした。じかんを おいて もう いちど おためしください。';

export default function Paywall() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    configureIAP();
    getProPackage().then(setPkg).catch(() => setPkg(null));
  }, []);

  // Real StoreKit price when the offering loads; otherwise the planned price.
  const priceLabel = pkg?.product.priceString ?? '¥1,000';

  async function purchasePro() {
    if (busy) return;
    if (!iapReady() || !pkg) {
      Alert.alert('うちのモン Pro', NOT_READY);
      return;
    }
    setBusy(true);
    try {
      const ok = await buyPro(pkg);
      if (ok) {
        await monsterStore.setPro(true);
        router.replace('/purchase-success');
      }
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('うちのモン Pro', NOT_READY);
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await restorePro();
      if (ok) {
        await monsterStore.setPro(true);
        router.replace('/purchase-success');
      } else {
        Alert.alert('うちのモン Pro', 'ふくげんできる こうにゅうが みつかりませんでした。');
      }
    } catch {
      Alert.alert('うちのモン Pro', NOT_READY);
    } finally {
      setBusy(false);
    }
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
          {busy ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.planMainTitle}>Pro（かいきり）</Text>
              <Text style={styles.planMainPrice}>{priceLabel}（1かいだけ）</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={restore} hitSlop={8} disabled={busy} style={styles.restore}>
          <Text style={styles.restoreText}>こうにゅうを ふくげんする</Text>
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
  restore: { alignSelf: 'center', paddingVertical: 8, marginTop: 2 },
  restoreText: { color: '#c9c2da', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  privacy: { fontSize: 12, color: '#b1aac0', lineHeight: 18, marginTop: 10 },
  legal: { fontSize: 11, color: '#8a8298', lineHeight: 16 },
});
