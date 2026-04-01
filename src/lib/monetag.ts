/**
 * Monetag Ads integration.
 * Only works inside the Telegram WebApp environment.
 */

declare global {
  interface Window {
    show_10818525?: (config?: { type: string }) => Promise<void>;
  }
}

function isTelegramWebApp(): boolean {
  return !!(window as any).Telegram?.WebApp?.initData;
}

/* ─── Interstitial (In-App) ─── */

let nextLevelCounter = 0;
const INTERSTITIAL_INTERVAL = 3;

/**
 * Track a "Next Level" click.  Shows a Monetag interstitial every 3 clicks.
 */
export async function trackNextLevel(): Promise<void> {
  nextLevelCounter += 1;
  if (nextLevelCounter >= INTERSTITIAL_INTERVAL) {
    nextLevelCounter = 0;
    await showInterstitial();
  }
}

async function showInterstitial(): Promise<void> {
  if (!isTelegramWebApp() || !window.show_10818525) {
    console.warn("[Monetag] SDK not available or not in Telegram WebApp");
    return;
  }
  try {
    await window.show_10818525({ type: "inApp" });
  } catch (e) {
    console.warn("[Monetag] Interstitial failed:", e);
  }
}

/* ─── Rewarded Ad ─── */

/**
 * Show a Monetag rewarded ad.
 * Returns true if watched successfully, false if skipped/failed/unavailable.
 */
export async function showMonetangRewardAd(): Promise<boolean> {
  if (!isTelegramWebApp() || !window.show_10818525) {
    console.warn("[Monetag] SDK not available or not in Telegram WebApp");
    return false;
  }
  try {
    await window.show_10818525();
    return true;
  } catch (e) {
    console.warn("[Monetag] Rewarded ad failed or skipped:", e);
    return false;
  }
}
