import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, BOTTOM_BAR_HEIGHT } from '../components/bottom-bar';
import { monsterStore } from '../engine/monster-store';
import { C, RADIUS, SHADOW } from '../theme/tokens';

const LEGAL = {
  privacy: 'https://uchinomon.pages.dev/privacy',
  terms: 'https://uchinomon.pages.dev/terms',
  support: 'https://uchinomon.pages.dev/support',
};

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pro, setPro] = useState(false);

  useFocusEffect(useCallback(() => { monsterStore.isPro().then(setPro).catch(() => setPro(false)); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 18, paddingTop: insets.top + 8 }} contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + 20 }}>
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
          <Text style={styles.privacy}>お子さまの えと なまえは、うちのモンの サーバーには おくりません。すべて この端末の中で しょりされます。</Text>
        </View>

        <InfoRow
          label="あそびかた"
          body={'1. 「とりこむ」で こどもの おえかきを えらぶよ\n2. きりぬいて、なまえを つけよう\n3. どうぶつえんで モンが くらしはじめるよ\n4. ときどき ひらくと、るすちゅうの できごとが ずかんに ふえていくよ'}
        />
        <InfoRow
          label="このアプリについて"
          body={'うちのモン  v1.0\n\nおえかきが いきものに なって、どうぶつえんで くらすアプリだよ。きりぬき・ずかん・るすちゅうの できごとは すべて この端末の中で つくられ、サーバーには おくられません。'}
        />

        <LinkRow label="プライバシーポリシー" url={LEGAL.privacy} />
        <LinkRow label="利用規約" url={LEGAL.terms} />
        <LinkRow label="サポート・お問い合わせ" url={LEGAL.support} />
      </ScrollView>
      <BottomBar active="settings" />
    </View>
  );
}

function InfoRow({ label, body }: { label: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.rowWrap}>
      <Pressable style={styles.row} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowChevron}>{open ? '⌄' : '›'}</Text>
      </Pressable>
      {open && <Text style={styles.rowBody}>{body}</Text>}
    </View>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <Pressable style={styles.rowWrap} onPress={() => Linking.openURL(url).catch(() => {})}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowChevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: C.ink, marginBottom: 12 },
  card: { backgroundColor: C.card, borderRadius: RADIUS.card, padding: 16, marginBottom: 12, ...SHADOW.soft },
  planLabel: { fontSize: 12, color: C.mutedInk, fontWeight: '700' },
  planValue: { fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 2 },
  upgrade: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  upgradeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sectionHead: { fontSize: 13, fontWeight: '800', color: C.inkSoft, marginBottom: 6 },
  privacy: { fontSize: 12.5, color: '#6c6480', lineHeight: 19 },
  rowWrap: { backgroundColor: C.card, borderRadius: RADIUS.btn, marginBottom: 10, overflow: 'hidden', ...SHADOW.soft },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: C.ink },
  rowChevron: { fontSize: 22, color: C.muted, fontWeight: '800' },
  rowBody: { paddingHorizontal: 16, paddingBottom: 14, marginTop: -4, fontSize: 12.5, color: '#6c6480', lineHeight: 20 },
});
