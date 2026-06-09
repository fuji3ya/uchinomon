import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { addProListener, configureIAP, hasProEntitlement } from '../iap';
import { monsterStore } from '../engine/monster-store';

// Safety net: on a release build an unhandled JS error (incl. async/microtask
// rejections that ErrorBoundary can't catch) is escalated to RCTFatal → SIGABRT
// hard crash. Keep the app alive instead so issues are diagnosable on-device.
{
  const g = globalThis as any;
  if (g?.ErrorUtils?.setGlobalHandler && !g.__uchiGuard) {
    g.__uchiGuard = true;
    const prev = g.ErrorUtils.getGlobalHandler?.();
    g.ErrorUtils.setGlobalHandler((e: any, isFatal?: boolean) => {
      console.warn('[uchi] caught', isFatal ? 'FATAL' : 'error', e?.message, '\n', e?.stack);
      if (!isFatal && typeof prev === 'function') prev(e, isFatal); // pass through non-fatal
    });
  }
}

// Root navigator. Tabs (どうぶつえん / ずかん / せってい) + the create-flow and
// monetization screens as pushed routes. No NativeTabs / no worklet splash.
export default function RootLayout() {
  // Auto-restore the non-consumable Pro entitlement on launch: configure RC and,
  // if StoreKit says this Apple ID owns Pro, re-grant the local flag. Fixes a
  // reinstall / new-device paying user being silently demoted to free. Upgrade-
  // only (never downgrades) so a transient offline check can't lock out a payer.
  useEffect(() => {
    (async () => {
      try {
        configureIAP();
        // Grant Pro the moment RC reports the entitlement active — catches
        // Ask-to-Buy approval / deferred purchase / post-network-drop reconcile.
        addProListener(() => {
          monsterStore.setPro(true).catch(() => {});
        });
        if (await hasProEntitlement()) await monsterStore.setPro(true);
      } catch {
        /* non-fatal — Settings → Restore remains as the manual fallback */
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* Routes auto-register from the file tree — do NOT enumerate Stack.Screen
          (a name that doesn't resolve creates a phantom screen whose loadRoute()
          is undefined → "Cannot read property 'ErrorBoundary' of undefined"). */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fdf6e9' } }} />
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
