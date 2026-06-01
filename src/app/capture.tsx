import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cutoutForeground, isSupported } from 'uchinomon-cutout';

import { C, RADIUS, SHADOW } from '../theme/tokens';

type Stage = 'idle' | 'picking' | 'cutting' | 'error';

export default function Capture() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const supported = isSupported();

  async function go(pick: () => Promise<ImagePicker.ImagePickerResult>) {
    setStage('picking');
    setError(null);
    try {
      const res = await pick();
      if (res.canceled || !res.assets.length) {
        setStage('idle');
        return;
      }
      const asset = res.assets[0];
      const aspect = asset.width && asset.height ? asset.width / asset.height : 1;

      let cutUri: string | null = null;
      if (supported) {
        setStage('cutting');
        try {
          cutUri = await cutoutForeground(asset.uri);
        } catch {
          cutUri = null; // fall back to "paper" (keep original) per ENGINE_SPEC §0.4
        }
      }

      router.replace({
        pathname: '/capture-choice',
        params: { original: asset.uri, cut: cutUri ?? '', aspect: String(aspect) },
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStage('error');
    }
  }

  async function library() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return fail('しゃしんへの アクセスが きょかされていません。');
    await go(() => ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }));
  }
  async function camera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return fail('カメラへの アクセスが きょかされていません。');
    await go(() => ImagePicker.launchCameraAsync({ quality: 1 }));
  }
  function fail(m: string) {
    setError(m);
    setStage('error');
  }

  const busy = stage === 'picking' || stage === 'cutting';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.close}>✕</Text></Pressable>
        <Text style={styles.title}>おえかきを とりこむ</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator size="large" color={C.accentDeep} />
            <Text style={styles.busyText}>{stage === 'picking' ? 'えらんでいます…' : 'きりぬいています…'}</Text>
          </View>
        ) : (
          <>
            <Image source={require('../../assets/monsters/dino-cut.png')} style={styles.hero} contentFit="contain" />
            <Text style={styles.lead}>こどもの おえかきを{'\n'}カメラで うつすか、ライブラリから えらんでね。</Text>
            <Pressable style={[styles.btn, styles.primary]} onPress={camera}><Text style={styles.btnText}>カメラで うつす</Text></Pressable>
            <Pressable style={[styles.btn, styles.ghost]} onPress={library}><Text style={[styles.btnText, { color: C.accentDeep }]}>ライブラリから えらぶ</Text></Pressable>
            {!supported && <Text style={styles.note}>※ この端末では「そのまま」モードで とりこみます（きりぬきは iOS 17 いじょう）。</Text>}
            {error && <Text style={styles.err}>{error}</Text>}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  close: { fontSize: 20, color: C.ink, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800', color: C.ink },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 14 },
  hero: { width: 150, height: 150 },
  lead: { fontSize: 14, color: C.inkSoft, textAlign: 'center', lineHeight: 21, marginBottom: 6 },
  btn: { width: '100%', borderRadius: RADIUS.btn, paddingVertical: 16, alignItems: 'center', ...SHADOW.soft },
  primary: { backgroundColor: C.accent },
  ghost: { backgroundColor: '#fff' },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  note: { fontSize: 12, color: C.mutedInk, textAlign: 'center', marginTop: 4 },
  err: { fontSize: 13, color: C.accentDeep, textAlign: 'center' },
  busy: { alignItems: 'center', gap: 12 },
  busyText: { fontSize: 15, color: C.accentDeep, fontWeight: '700' },
});
