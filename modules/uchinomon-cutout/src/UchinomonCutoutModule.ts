import { requireNativeModule } from 'expo';

// Load the native module defensively. If autolinking did NOT include the
// native UchinomonCutout module, requireNativeModule throws at import time —
// which, on a release build, becomes an unhandled JS exception → RCTFatal →
// hard crash on launch (no red screen in release). Catching it here turns that
// fatal into a graceful "unsupported" so the app launches and we can SEE the
// real state instead of crashing.
export type ImageAnalysis = { colors: string[]; width: number; height: number };

type CutoutNative = {
  isSupported(): boolean;
  cutoutForeground(uri: string): Promise<string>;
  analyze(uri: string): Promise<ImageAnalysis>;
  __loadError?: string;
};

let nativeModule: CutoutNative;
try {
  nativeModule = requireNativeModule<CutoutNative>('UchinomonCutout');
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  nativeModule = {
    isSupported: () => false,
    cutoutForeground: async () => {
      throw new Error('UchinomonCutout native module is not linked: ' + msg);
    },
    analyze: async () => ({ colors: [], width: 0, height: 0 }),
    __loadError: msg,
  };
}

export default nativeModule;
