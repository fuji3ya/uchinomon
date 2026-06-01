import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RenderMode } from '../engine/types';
import { C, RADIUS, SHADOW } from '../theme/tokens';

export default function CaptureChoice() {
  const router = useRouter();
  const { original, cut, aspect } = useLocalSearchParams<{ original: string; cut: string; aspect: string }>();
  const hasCut = !!cut;
  const [mode, setMode] = useState<RenderMode>(hasCut ? 'cut' : 'paper');

  function confirm() {
    router.replace({
      pathname: '/naming',
      params: { original, cut: cut ?? '', aspect: aspect ?? '1', mode },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.head}>
        <Text style={styles.title}>これで OK？</Text>
        <Text style={styles.sub}>すきな ほうを えらんでね</Text>
      </View>

      <View style={styles.options}>
        {hasCut && (
          <Choice
            selected={mode === 'cut'}
            onPress={() => setMode('cut')}
            label="きりぬき（とうめい）"
            desc="どうぶつえんを あるきまわる"
            checker
          >
            <Image source={{ uri: cut }} style={styles.art} contentFit="contain" />
          </Choice>
        )}
        <Choice
          selected={mode === 'paper'}
          onPress={() => setMode('paper')}
          label="そのまま（はいけいあり）"
          desc="かみの まま どうぶつえんを あるく"
        >
          <Image source={{ uri: original }} style={styles.artPaper} contentFit="contain" />
        </Choice>
      </View>

      <View style={styles.footer}>
        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, styles.ghost]} onPress={() => router.replace('/capture')}>
            <Text style={[styles.btnText, { color: C.ink }]}>とりなおす</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.primary]} onPress={confirm}>
            <Text style={styles.btnText}>これにする</Text>
          </Pressable>
        </View>
        <Text style={styles.note}>「これにする」まで、きょうの 1ぴきは へらないよ</Text>
      </View>
    </SafeAreaView>
  );
}

function Choice({ selected, onPress, label, desc, checker, children }: any) {
  return (
    <Pressable style={[styles.card, selected && styles.cardSel]} onPress={onPress}>
      <View style={[styles.preview, checker && styles.checker]}>{children}</View>
      <View style={styles.cardFoot}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
        <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Text style={styles.check}>✓</Text>}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  head: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: C.ink },
  sub: { fontSize: 13, color: C.mutedInk, marginTop: 2 },
  options: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  card: { flex: 1, backgroundColor: C.card, borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', ...SHADOW.soft },
  cardSel: { borderColor: C.accent },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checker: { backgroundColor: '#e9e4ef' },
  art: { width: '70%', height: '90%' },
  artPaper: { width: '60%', height: '85%' },
  cardFoot: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cardLabel: { fontSize: 15, fontWeight: '800', color: C.ink },
  cardDesc: { fontSize: 11.5, color: C.mutedInk, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d9d2e6', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: C.accentDeep, borderColor: C.accentDeep },
  check: { color: '#fff', fontSize: 13, fontWeight: '900' },
  footer: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: RADIUS.btn, paddingVertical: 15, alignItems: 'center', ...SHADOW.soft },
  ghost: { backgroundColor: '#fff' },
  primary: { backgroundColor: C.accent, flex: 1.4 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  note: { fontSize: 11.5, color: C.mutedInk, textAlign: 'center' },
});
