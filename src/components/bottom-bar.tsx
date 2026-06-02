import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, SHADOW } from '../theme/tokens';

// Persistent bottom bar rendered by the 3 main screens. Avoids expo-router's
// Tabs/group layout entirely (plain Stack navigation only) — どうぶつえん / ずかん
// + center とりこむ FAB + せってい.
export type TabKey = 'index' | 'zukan' | 'settings';

const ITEMS: { key: TabKey; label: string; icon: SFSymbol; href: '/' | '/zukan' | '/settings' }[] = [
  { key: 'index', label: 'どうぶつえん', icon: 'house.fill', href: '/' },
  { key: 'zukan', label: 'ずかん', icon: 'book.fill', href: '/zukan' },
  { key: 'settings', label: 'せってい', icon: 'gearshape.fill', href: '/settings' },
];

export const BOTTOM_BAR_HEIGHT = 86;

export function BottomBar({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <Btn item={ITEMS[0]} active={active === 'index'} onPress={() => router.replace('/')} />
      <Btn item={ITEMS[1]} active={active === 'zukan'} onPress={() => router.replace('/zukan')} />
      <Pressable style={styles.fabWrap} onPress={() => router.push('/capture')} hitSlop={8}>
        <View style={styles.fab}><SymbolView name="camera.fill" size={26} tintColor="#fff" /></View>
        <Text style={styles.fabLabel}>とりこむ</Text>
      </Pressable>
      <Btn item={ITEMS[2]} active={active === 'settings'} onPress={() => router.replace('/settings')} />
    </View>
  );
}

function Btn({ item, active, onPress }: { item: (typeof ITEMS)[number]; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress} hitSlop={6}>
      <SymbolView name={item.icon} size={23} tintColor={active ? C.accentDeep : C.muted} />
      <Text style={[styles.label, { color: active ? C.accentDeep : C.muted }]}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around',
    backgroundColor: C.card, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0e7d8', ...SHADOW.soft,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 2 },
  label: { fontSize: 10.5, fontWeight: '800' },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -22 },
  fab: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: C.card, shadowColor: C.accentDeep, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  fabLabel: { fontSize: 10.5, fontWeight: '800', color: C.accentDeep, marginTop: 4 },
});
