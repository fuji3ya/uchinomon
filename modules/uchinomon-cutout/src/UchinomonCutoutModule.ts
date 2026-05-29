import { NativeModule, requireNativeModule } from 'expo';

declare class UchinomonCutoutModule extends NativeModule<{}> {
  isSupported(): boolean;
  cutoutForeground(uri: string): Promise<string>;
}

export default requireNativeModule<UchinomonCutoutModule>('UchinomonCutout');
