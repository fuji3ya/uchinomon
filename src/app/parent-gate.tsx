import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, RADIUS, SHADOW } from '../theme/tokens';

// Apple 5.1.4 parental gate. Face ID is the primary check; when biometrics are
// unavailable / declined we fall back to a simple arithmetic gate (a young child
// can't solve it, an adult can) — we never let the gate be bypassed silently.
export default function ParentGate() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [mathMode, setMathMode] = useState(false);
  const [answer, setAnswer] = useState('');
  // two 2-digit numbers; stable for this screen instance
  const [problem] = useState(() => ({ a: 11 + Math.floor(Math.random() * 29), b: 11 + Math.floor(Math.random() * 29) }));

  const pass = () => router.replace('/paywall');

  async function tryFaceID() {
    setErr(null);
    const ok = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!ok) {
      setMathMode(true); // no biometrics → require the arithmetic gate instead
      return;
    }
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'おうちのかたの かくにん', cancelLabel: 'やめる', disableDeviceFallback: false,
    });
    if (r.success) pass();
    else setErr('かくにんが できませんでした。');
  }

  function checkMath() {
    if (Number(answer.trim()) === problem.a + problem.b) pass();
    else setErr('もういちど けいさんしてね。');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.lock}><Text style={{ fontSize: 40 }}>🔒</Text></View>
        <Text style={styles.title}>おとなの かたへ</Text>

        {!mathMode ? (
          <>
            <Text style={styles.lead}>ここから さきは おとなの かたの ページです。{'\n'}Face ID で かくにんしてください。</Text>
            <Pressable style={styles.btn} onPress={tryFaceID}><Text style={styles.btnText}>Face ID で つづける</Text></Pressable>
            <Pressable onPress={() => setMathMode(true)} hitSlop={8}><Text style={styles.alt}>Face ID が つかえない</Text></Pressable>
          </>
        ) : (
          <>
            <Text style={styles.lead}>おとなの かた だけが すすめます。{'\n'}つぎの けいさんを いれてください。</Text>
            <Text style={styles.math}>{problem.a} ＋ {problem.b} ＝ ?</Text>
            <TextInput
              value={answer}
              onChangeText={setAnswer}
              keyboardType="number-pad"
              placeholder="こたえ"
              placeholderTextColor={C.muted}
              style={styles.input}
              maxLength={3}
            />
            <Pressable style={styles.btn} onPress={checkMath}><Text style={styles.btnText}>すすむ</Text></Pressable>
          </>
        )}

        {err && <Text style={styles.err}>{err}</Text>}
        <Pressable onPress={() => router.back()} hitSlop={8}><Text style={styles.cancel}>もどる</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 },
  lock: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW.card },
  title: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 8 },
  lead: { fontSize: 14, color: C.inkSoft, textAlign: 'center', lineHeight: 22 },
  math: { fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: 1 },
  input: { backgroundColor: '#fff', borderRadius: RADIUS.btn, paddingVertical: 12, paddingHorizontal: 24, fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center', minWidth: 140, ...SHADOW.soft },
  btn: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 16, paddingHorizontal: 30, marginTop: 6, ...SHADOW.card },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  alt: { color: C.mutedInk, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  err: { color: C.accentDeep, fontSize: 13 },
  cancel: { color: C.mutedInk, fontSize: 14, fontWeight: '700', marginTop: 6 },
});
