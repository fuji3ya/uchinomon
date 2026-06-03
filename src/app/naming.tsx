import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as FileSystem from 'expo-file-system/legacy';
import { analyze } from 'uchinomon-cutout';

import { buildMonster, deriveAttributes, mapHexToColorWords, stableHash } from '../engine';
import type { RenderMode } from '../engine/types';
import { monsterStore } from '../engine/monster-store';
import { C, RADIUS, SHADOW } from '../theme/tokens';

export default function Naming() {
  const router = useRouter();
  const { original, cut, aspect, mode } = useLocalSearchParams<{ original: string; cut: string; aspect: string; mode: RenderMode }>();

  const createdAtMs = useMemo(() => Date.now(), []);
  const pixelHash = useMemo(() => String(stableHash((original ?? '') + ':' + createdAtMs)), [original, createdAtMs]);
  const aspectNum = Number(aspect) || 1;

  // Real dominant colours from the actual drawing (on-device). Until analysis
  // resolves, colours fall back to "カラフル" so nothing false is shown.
  const [colorWords, setColorWords] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    analyze(cut || original || '')
      .then((a) => { if (alive) setColorWords(mapHexToColorWords(a.colors)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [cut, original]);

  const attributes = useMemo(() => deriveAttributes(pixelHash, aspectNum, colorWords), [pixelHash, aspectNum, colorWords]);
  const candidates = useMemo(
    () => buildMonster({ pixelHash, aspect: aspectNum, number: 0, createdAtMs, originalUri: '', cutUri: null, renderMode: 'cut', attributes }).card.nameCandidates,
    [pixelHash, aspectNum, createdAtMs, attributes],
  );

  const [name, setName] = useState('');
  useEffect(() => {
    if (!name && candidates[0]) setName(candidates[0]);
  }, [candidates]); // eslint-disable-line react-hooks/exhaustive-deps

  const [saving, setSaving] = useState(false);

  // Copy a captured temp image into the app's permanent document dir so monsters
  // survive app restarts (ImagePicker / cutout write to temporary storage).
  async function persist(src: string, suffix: string): Promise<string> {
    try {
      const dir = FileSystem.documentDirectory + 'monsters/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const dest = `${dir}${pixelHash}-${suffix}.png`;
      await FileSystem.copyAsync({ from: src, to: dest });
      return dest;
    } catch {
      return src; // fall back to the temp uri rather than fail intake
    }
  }

  async function confirm() {
    if (saving) return;
    setSaving(true);
    const now = Date.now();
    if (!(await monsterStore.canIntake(now))) {
      setSaving(false);
      router.replace('/parent-gate');
      return;
    }
    const number = await monsterStore.nextNumber();
    const renderMode: RenderMode = mode === 'paper' || !cut ? 'paper' : 'cut';
    const originalUri = await persist(original!, 'orig');
    const cutUri = cut ? await persist(cut, 'cut') : null;
    const monster = buildMonster({
      pixelHash, aspect: aspectNum, number, createdAtMs: now,
      originalUri, cutUri, renderMode,
      overrideName: name.trim() || candidates[0], attributes,
    });
    await monsterStore.addMonster(monster, now);
    router.replace(`/reveal?id=${encodeURIComponent(monster.id)}`);
  }

  const previewUri = mode === 'paper' || !cut ? original : cut;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>なまえを つけよう</Text>
        <View style={[styles.previewBox, (mode === 'cut' && !!cut) && styles.checker]}>
          <Image source={{ uri: previewUri }} style={styles.preview} contentFit="contain" />
        </View>

        <Text style={styles.label}>こうほから えらぶ</Text>
        <View style={styles.chips}>
          {candidates.map((c) => (
            <Pressable key={c} style={[styles.chip, name === c && styles.chipOn]} onPress={() => setName(c)}>
              <Text style={[styles.chipText, name === c && styles.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>じぶんで つける</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="なまえを いれてね"
          placeholderTextColor={C.muted}
          style={styles.input}
          maxLength={12}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.btn, saving && { opacity: 0.6 }]} onPress={confirm} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'とりこんでいます…' : 'どうぶつえんに むかえる'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  body: { padding: 22, gap: 14 },
  title: { fontSize: 22, fontWeight: '800', color: C.ink },
  previewBox: { height: 220, borderRadius: RADIUS.card, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW.soft },
  checker: { backgroundColor: '#e9e4ef' },
  preview: { width: '70%', height: '90%' },
  label: { fontSize: 13, fontWeight: '800', color: C.inkSoft, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderRadius: RADIUS.chip, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 2, borderColor: 'transparent', ...SHADOW.soft },
  chipOn: { borderColor: C.accent, backgroundColor: '#fff3f7' },
  chipText: { fontSize: 15, fontWeight: '800', color: C.inkSoft },
  chipTextOn: { color: C.accentDeep },
  input: { backgroundColor: '#fff', borderRadius: RADIUS.btn, padding: 15, fontSize: 18, fontWeight: '700', color: C.ink, ...SHADOW.soft },
  footer: { padding: 16 },
  btn: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 16, alignItems: 'center', ...SHADOW.card },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
