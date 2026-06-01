import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, RADIUS, SHADOW } from '../theme/tokens';

export default function PurchaseSuccess() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.badge}><Text style={{ fontSize: 44 }}>🎉</Text></View>
        <Text style={styles.title}>ありがとう！</Text>
        <Text style={styles.lead}>
          うちのモン Pro が つかえるように なりました。{'\n'}おもいでを いっぱい のこそうね。
        </Text>
        <Pressable style={styles.btn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.btnText}>どうぶつえんに もどる</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 },
  badge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...SHADOW.card },
  title: { fontSize: 26, fontWeight: '800', color: C.accentDeep, marginTop: 8 },
  lead: { fontSize: 14.5, color: C.inkSoft, textAlign: 'center', lineHeight: 22 },
  btn: { backgroundColor: C.accent, borderRadius: RADIUS.btn, paddingVertical: 16, paddingHorizontal: 28, marginTop: 10, ...SHADOW.card },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
