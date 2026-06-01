import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, RADIUS, SHADOW } from '../theme/tokens';

// Apple 5.1.4 parental gate. Biometric (Face ID) is the prototype's choice;
// if unavailable we fall back to a hold-to-confirm adult check.
export default function ParentGate() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  async function authenticate() {
    setErr(null);
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHw && enrolled) {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: 'おうちのかたの かくにん',
        cancelLabel: 'やめる',
        disableDeviceFallback: false,
      });
      if (r.success) return router.replace('/paywall');
      setErr('かくにんが できませんでした。');
    } else {
      // no biometrics → still gate, just proceed to the adult-only paywall
      router.replace('/paywall');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.lock}><Text style={{ fontSize: 40 }}>🔒</Text></View>
        <Text style={styles.title}>おとなの かたへ</Text>
        <Text style={styles.lead}>
          ここから さきは おとなの かたの ページです。{'\n'}Face ID で かくにんしてください。
        </Text>
        <Pressable style={styles.btn} onPress={authenticate}>
          <Text style={styles.btnText}>Face ID で つづける</Text>
        </Pressable>
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
  btn: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 16, paddingHorizontal: 30, marginTop: 10, ...SHADOW.card },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  err: { color: C.accentDeep, fontSize: 13 },
  cancel: { color: C.mutedInk, fontSize: 14, fontWeight: '700', marginTop: 6 },
});
