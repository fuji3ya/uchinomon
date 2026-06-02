import { Tabs, useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, SHADOW } from '../../theme/tokens';

const TABS: { name: string; label: string; icon: SFSymbol }[] = [
  { name: 'index', label: 'どうぶつえん', icon: 'house.fill' },
  { name: 'zukan', label: 'ずかん', icon: 'book.fill' },
  { name: 'settings', label: 'せってい', icon: 'gearshape.fill' },
];

export default function TabsLayout() {
  // index / zukan / settings auto-register from the file tree. The custom tab
  // bar renders the TABS array explicitly, so discovery order doesn't matter.
  return <Tabs tabBar={(props) => <UchiTabBar {...props} />} screenOptions={{ headerShown: false }} />;
}

function UchiTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const current = state.routes[state.index]?.name;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <TabBtn {...TABS[0]} active={current === 'index'} onPress={() => navigation.navigate('index')} />
      <TabBtn {...TABS[1]} active={current === 'zukan'} onPress={() => navigation.navigate('zukan')} />

      {/* center とりこむ FAB → capture flow */}
      <Pressable style={styles.fabWrap} onPress={() => router.push('/capture')} hitSlop={8}>
        <View style={styles.fab}>
          <SymbolView name="camera.fill" size={26} tintColor="#fff" />
        </View>
        <Text style={styles.fabLabel}>とりこむ</Text>
      </Pressable>

      <TabBtn {...TABS[2]} active={current === 'settings'} onPress={() => navigation.navigate('settings')} />
    </View>
  );
}

function TabBtn({ label, icon, active, onPress }: { label: string; icon: SFSymbol; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress} hitSlop={6}>
      <SymbolView name={icon} size={23} tintColor={active ? C.accentDeep : C.muted} />
      <Text style={[styles.label, { color: active ? C.accentDeep : C.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    backgroundColor: C.card,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0e7d8',
    ...SHADOW.soft,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 2 },
  label: { fontSize: 10.5, fontWeight: '800' },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -22 },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: C.card,
    shadowColor: C.accentDeep, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  fabLabel: { fontSize: 10.5, fontWeight: '800', color: C.accentDeep, marginTop: 4 },
});
