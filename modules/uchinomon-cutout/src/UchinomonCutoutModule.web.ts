import { registerWebModule, NativeModule } from 'expo';

// Web has no on-device Vision. うちのモン ships iOS-only; this stub keeps web bundling alive.
class UchinomonCutoutModule extends NativeModule<{}> {
  isSupported(): boolean {
    return false;
  }

  async cutoutForeground(_uri: string): Promise<string> {
    throw new Error('UchinomonCutout は iOS せんようです。');
  }
}

export default registerWebModule(UchinomonCutoutModule, 'UchinomonCutoutModule');
