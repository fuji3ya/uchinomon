// In-app purchase wrapper (#13). Non-consumable "Pro" unlock via RevenueCat.
// Env-driven: the iOS public SDK key is injected at build time as
// EXPO_PUBLIC_RC_API_KEY_IOS. If it is absent (dev build before the key is
// issued) the module reports "not ready" and never grants Pro for free —
// submission-safe (no fake unlock). All entitlement state comes from StoreKit.
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

export const PRO_ENTITLEMENT = 'pro';
const API_KEY = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '';

let configured = false;

export function configureIAP(): void {
  if (configured || Platform.OS !== 'ios' || !API_KEY) return;
  try {
    Purchases.configure({ apiKey: API_KEY });
    configured = true;
  } catch {
    configured = false;
  }
}

export function iapReady(): boolean {
  return configured;
}

// The current offering's first package (the one-time Pro unlock).
export async function getProPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const off = offerings.all?.['default'] ?? offerings.current;
    const pkgs = off?.availablePackages ?? [];
    // Select the Pro product BY IDENTIFIER, not by index — if the offering ever
    // holds >1 package, [0] could be the wrong product (wrong price charged).
    return pkgs.find((p) => p.product.identifier === 'app.starvingeffort.uchinomon.pro') ?? pkgs[0] ?? null;
  } catch {
    return null;
  }
}

// Returns true iff the Pro entitlement is active after the purchase.
export async function buyPro(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
}

// Restore Purchases (required by Apple 3.1.1 even for non-consumables).
export async function restorePro(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active[PRO_ENTITLEMENT];
  } catch {
    return false;
  }
}

// Source-of-truth check against StoreKit (used to re-sync the local flag).
export async function hasProEntitlement(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[PRO_ENTITLEMENT];
  } catch {
    return false;
  }
}

// Fires whenever RevenueCat reports the customer info changed AND Pro is active.
// Catches an OUT-OF-BAND grant: Ask-to-Buy parental approval (the PRIMARY flow
// for a kids' app), a deferred/SCA bank approval, or the eventual reconcile
// after a network drop mid-purchase. Upgrade-only — never revokes.
let proListenerAdded = false;
export function addProListener(onActive: () => void): void {
  if (proListenerAdded || Platform.OS !== 'ios' || !API_KEY) return;
  proListenerAdded = true; // register at most once (RootLayout mounts once; guards Fast-Refresh dup)
  try {
    Purchases.addCustomerInfoUpdateListener((info) => {
      if (info.entitlements.active[PRO_ENTITLEMENT]) onActive();
    });
  } catch {
    proListenerAdded = false; // allow a retry if registration threw
  }
}
