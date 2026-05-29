import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cutoutForeground, isSupported } from '../../modules/uchinomon-cutout';

type Stage = 'idle' | 'picking' | 'cutting' | 'done' | 'error';

export default function HomeScreen() {
  const [stage, setStage] = useState<Stage>('idle');
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const supported = isSupported();

  async function run(pick: () => Promise<ImagePicker.ImagePickerResult>) {
    setStage('picking');
    setErrorMsg(null);
    setResultUri(null);
    setSourceUri(null);
    setElapsedMs(null);
    try {
      const picked = await pick();
      if (picked.canceled || picked.assets.length === 0) {
        setStage('idle');
        return;
      }
      const uri = picked.assets[0].uri;
      setSourceUri(uri);
      setStage('cutting');
      const t0 = Date.now();
      const out = await cutoutForeground(uri);
      setElapsedMs(Date.now() - t0);
      setResultUri(out);
      setStage('done');
    } catch (e: any) {
      setErrorMsg(e?.message ?? String(e));
      setStage('error');
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('しゃしんへの アクセスが きょかされていません。');
      setStage('error');
      return;
    }
    await run(() =>
      ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }),
    );
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('カメラへの アクセスが きょかされていません。');
      setStage('error');
      return;
    }
    await run(() => ImagePicker.launchCameraAsync({ quality: 1 }));
  }

  const busy = stage === 'picking' || stage === 'cutting';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>きりぬき PoC</Text>
        <Text style={styles.support}>
          isSupported(): {supported ? '✅ true' : '❌ false'} ({Platform.OS})
        </Text>

        <View style={styles.row}>
          <Pressable
            style={[styles.btn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={pickFromLibrary}>
            <Text style={styles.btnText}>ライブラリ</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={takePhoto}>
            <Text style={styles.btnText}>さつえい</Text>
          </Pressable>
        </View>

        {busy && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color="#e96997" />
            <Text style={styles.statusText}>
              {stage === 'picking' ? 'えらんでいます…' : 'きりぬいています…'}
            </Text>
          </View>
        )}

        {stage === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {sourceUri && (
          <View style={styles.block}>
            <Text style={styles.label}>もとの しゃしん</Text>
            <Image source={{ uri: sourceUri }} style={styles.preview} contentFit="contain" />
          </View>
        )}

        {resultUri && (
          <View style={styles.block}>
            <Text style={styles.label}>
              きりぬき けっか {elapsedMs != null ? `(${elapsedMs}ms)` : ''}
            </Text>
            {/* checkerboard-ish gray so transparency is visible */}
            <View style={styles.checker}>
              <Image source={{ uri: resultUri }} style={styles.preview} contentFit="contain" />
            </View>
            <Text style={styles.uri}>{resultUri}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fdf6e9' },
  container: { padding: 20, gap: 16, alignItems: 'stretch' },
  title: { fontSize: 28, fontWeight: '800', color: '#e96997', textAlign: 'center' },
  support: { fontSize: 14, color: '#555', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  btn: {
    backgroundColor: '#ff8bb0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statusBox: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  statusText: { color: '#e96997', fontSize: 16 },
  errorBox: { backgroundColor: '#ffe3ec', borderRadius: 12, padding: 16 },
  errorText: { color: '#b3245e', fontSize: 15 },
  block: { gap: 8 },
  label: { fontSize: 16, fontWeight: '700', color: '#333' },
  preview: { width: '100%', height: 320, borderRadius: 12 },
  checker: { backgroundColor: '#ccc', borderRadius: 12, overflow: 'hidden' },
  uri: { fontSize: 11, color: '#888' },
});
