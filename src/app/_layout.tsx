import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Root navigator. Tabs (どうぶつえん / ずかん / せってい) + the create-flow and
// monetization screens as pushed routes. No NativeTabs / no worklet splash.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fdf6e9' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="capture" options={{ presentation: 'modal' }} />
        <Stack.Screen name="capture-choice" />
        <Stack.Screen name="naming" />
        <Stack.Screen name="card/[id]" />
        <Stack.Screen name="parent-gate" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        <Stack.Screen name="purchase-success" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

// Surface any route error on screen instead of a release-mode hard crash.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1d1a26' }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text style={{ color: '#ff8bb0', fontSize: 22, fontWeight: '800' }}>起動エラー（捕捉済）</Text>
          <Text selectable style={{ color: '#ffd06b', fontSize: 15, fontWeight: '700' }}>
            {error?.name}: {error?.message}
          </Text>
          <Text selectable style={{ color: '#d9d2e6', fontSize: 12 }}>{error?.stack}</Text>
          <Text onPress={() => retry()} style={{ color: '#7ec98f', fontSize: 16, marginTop: 16 }}>↻ もう一度</Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
