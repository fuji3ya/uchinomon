import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { monsterStore } from '../engine/monster-store';
import { cardRarity } from '../engine/rarity';
import type { Monster } from '../engine/types';
import { C, RADIUS, SHADOW } from '../theme/tokens';

// Phase 4: birth reveal. The child's drawing "comes alive" — paper softens, the
// cutout springs in with a glow + sparkles, then the name + dex number rise.
// Pacing per animation-dramatic-pacing: start after the nav transition settles.
export default function Reveal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [m, setM] = useState<Monster | null>(null);
  const [done, setDone] = useState(false);

  const paper = useRef(new Animated.Value(1)).current;
  const cut = useRef(new Animated.Value(0)).current;   // scale + opacity driver
  const glow = useRef(new Animated.Value(0)).current;
  const info = useRef(new Animated.Value(0)).current;   // name/No. rise
  const sparks = useRef([0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    (async () => {
      try {
        const all = await monsterStore.all();
        setM(all.find((x) => x.id === decodeURIComponent(id ?? '')) ?? null);
      } catch { setM(null); }
    })();
  }, [id]);

  useEffect(() => {
    if (!m) return;
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(paper, { toValue: 0.25, duration: 600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.spring(cut, { toValue: 1, useNativeDriver: true, speed: 5, bounciness: 11 }),
          Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          ...sparks.map((s, i) =>
            Animated.timing(s, { toValue: 1, duration: 700, delay: i * 60, easing: Easing.out(Easing.quad), useNativeDriver: true })),
          Animated.timing(info, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]),
      ]).start(() => setDone(true));
    });
    return () => task.cancel();
  }, [m, paper, cut, glow, info, sparks]);

  if (!m) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.dim}>よみこみ中…</Text></View></SafeAreaView>;
  }

  const cutUri = m.renderMode === 'paper' ? m.originalUri : m.cutUri ?? m.originalUri;
  const num = String(m.card.number).padStart(3, '0');
  const isLegend = cardRarity(m.seed) === 'legend';
  const scale = cut.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.2, 1.15, 1] });

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[C.nightTop, '#241d3a']} style={StyleSheet.absoluteFill as any} />
      <View style={styles.center}>
        <Text style={styles.kicker}>あたらしい なかま</Text>

        <View style={styles.stage}>
          {/* glow halo */}
          <Animated.View style={[styles.glow, isLegend && styles.glowLegend, {
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, isLegend ? 0.9 : 0.6] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) }],
          }]} />
          {/* the original drawing, softening */}
          <Animated.View style={[styles.layer, { opacity: paper }]}>
            <Image source={{ uri: m.originalUri }} style={styles.art} contentFit="contain" />
          </Animated.View>
          {/* the living cutout springing in */}
          <Animated.View style={[styles.layer, { opacity: cut, transform: [{ scale }] }]}>
            <Image source={{ uri: cutUri }} style={styles.art} contentFit="contain" />
          </Animated.View>
          {/* sparkles */}
          {sparks.map((s, i) => {
            const ang = (i / sparks.length) * Math.PI * 2;
            const r = 96;
            return (
              <Animated.View key={i} pointerEvents="none" style={[styles.spark, {
                opacity: s.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: s.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(ang) * r] }) },
                  { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(ang) * r] }) },
                  { scale: s.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                ],
              }]} />
            );
          })}
        </View>

        <Animated.View style={{ opacity: info, transform: [{ translateY: info.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
          <Text style={styles.born}>うまれた！</Text>
          <Text style={styles.name}>{m.card.name}</Text>
          <Text style={styles.no}>No.{num}</Text>
        </Animated.View>
      </View>

      <View style={[styles.actions, { opacity: done ? 1 : 0.4 }]} pointerEvents={done ? 'auto' : 'none'}>
        <Pressable style={styles.primary} onPress={() => router.replace(`/card/${encodeURIComponent(m.id)}`)}>
          <Text style={styles.primaryText}>ずかんを みる</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryText}>どうぶつえんへ</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.nightTop },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 24 },
  dim: { color: '#ccc' },
  kicker: { color: C.gold, fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  stage: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#ffe9a8' },
  glowLegend: { backgroundColor: '#ffd24a' },
  layer: { position: 'absolute', width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  art: { width: '100%', height: '100%' },
  spark: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff6cf', ...SHADOW.soft },
  born: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  no: { color: C.gold, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  actions: { padding: 22, gap: 10 },
  primary: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 16, alignItems: 'center', ...SHADOW.card },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#cfc7e0', fontSize: 14, fontWeight: '700' },
});
