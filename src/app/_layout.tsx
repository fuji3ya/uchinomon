import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Minimal root for the cutout PoC. Intentionally avoids the default-template
// `expo-router/unstable-native-tabs` (NativeTabs) and the reanimated worklet
// splash overlay — both run at launch and are the prime suspects for the
// on-device launch crash. The PoC only needs to reach the single cutout
// screen (index). Tabs/splash/explore come back later once the screens are
// designed and ported (task #11).
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
