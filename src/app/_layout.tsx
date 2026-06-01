import { Stack } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Minimal root for the cutout PoC: a plain Stack (no NativeTabs / no worklet
// splash), so the single cutout screen (index) is the root.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}

// Expo Router renders this for any error thrown while loading/rendering a route
// in this segment (including import-time throws of the route module). On a
// release build an uncaught JS error otherwise becomes RCTFatal → hard crash,
// so this surfaces the real message ON SCREEN instead of crashing.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1d1a26' }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text style={{ color: '#ff8bb0', fontSize: 22, fontWeight: '800' }}>
            起動エラー（捕捉済）
          </Text>
          <Text selectable style={{ color: '#ffd06b', fontSize: 15, fontWeight: '700' }}>
            {error?.name}: {error?.message}
          </Text>
          <Text selectable style={{ color: '#d9d2e6', fontSize: 12 }}>
            {error?.stack}
          </Text>
          <Text onPress={() => retry()} style={{ color: '#7ec98f', fontSize: 16, marginTop: 16 }}>
            ↻ もう一度
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
