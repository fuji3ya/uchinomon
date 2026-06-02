import UchinomonCutoutModule, { type ImageAnalysis } from './src/UchinomonCutoutModule';

export type { ImageAnalysis };

// Whether the running OS can do the on-device foreground cutout (iOS 17+).
export function isSupported(): boolean {
  return UchinomonCutoutModule.isSupported();
}

// Cut the foreground (the child's drawing) out of a photo entirely on-device.
// Returns a file:// URI to a transparent PNG. No network, no upload (COPPA).
export async function cutoutForeground(uri: string): Promise<string> {
  return UchinomonCutoutModule.cutoutForeground(uri);
}

// Dominant colors of the actual drawing (on-device, no network). Used to make
// the dex description match what the child drew.
export async function analyze(uri: string): Promise<ImageAnalysis> {
  return UchinomonCutoutModule.analyze(uri);
}
