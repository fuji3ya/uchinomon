import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const EVENTS_KEY = 'um.review.events';
const ASKED_KEY = 'um.review.asked';

/**
 * Record one "value moment" (a monster joined the zoo) and, the second time it
 * happens, ask for an App Store rating — once per install, right after the
 * birth-reveal animation finished. The parent is holding the phone at that
 * moment (the child drew, the grown-up photographed), so the prompt lands with
 * the right person. Never on the first monster: first impressions stay clean.
 */
export async function recordValueMomentAndMaybeAskReview(): Promise<void> {
  try {
    const [rawCount, asked] = await Promise.all([
      AsyncStorage.getItem(EVENTS_KEY),
      AsyncStorage.getItem(ASKED_KEY),
    ]);
    const count = (Number.parseInt(rawCount ?? '0', 10) || 0) + 1;
    await AsyncStorage.setItem(EVENTS_KEY, String(count));
    if (asked === '1' || count < 2) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    // Mark asked BEFORE requesting — a re-render mid-prompt must not double-ask.
    await AsyncStorage.setItem(ASKED_KEY, '1');
    await StoreReview.requestReview();
  } catch {
    // Rating is a bonus; it must never break the reveal experience.
  }
}
