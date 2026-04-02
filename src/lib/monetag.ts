/**
 * Monetag Ads integration.
 * Only works inside the Telegram WebApp environment.
 */

declare global {
  interface Window {
    show_10818525?: (config?: {
      type?: string;
      inAppSettings?: {
        frequency?: number;
        capping?: number;
        interval?: number;
        timeout?: number;
        everyPage?: boolean;
      };
    }) => Promise<void>;
  }
}

const MONETAG_SDK_URL = "https://libtl.com/sdk.js";

function isTelegramWebApp(): boolean {
  return !!(window as any).Telegram?.WebApp;
}

function hasMonetagSdk(): boolean {
  return typeof window.show_10818525 === "function";
}

function injectMonetagFallbackScript(): void {
  if (document.querySelector('script[data-sdk-fallback="show_10818525"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = MONETAG_SDK_URL;
  script.async = true;
  script.dataset.zone = "10818525";
  script.dataset.sdk = "show_10818525";
  script.dataset.sdkFallback = "show_10818525";
  document.head.appendChild(script);
}

async function ensureMonetagSdk(timeoutMs = 4000): Promise<boolean> {
  if (!isTelegramWebApp()) return false;
  if (hasMonetagSdk()) return true;

  const start = Date.now();
  let fallbackInjected = false;

  while (Date.now() - start < timeoutMs) {
    if (hasMonetagSdk()) return true;

    if (!fallbackInjected && Date.now() - start >= 800) {
      injectMonetagFallbackScript();
      fallbackInjected = true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 200));
  }

  return hasMonetagSdk();
}

/* ─── Interstitial (In-App) ─── */

/**
 * Show a Monetag rewarded interstitial after every 3 levels cleared.
 * Pass the 0-indexed level that was just completed.
 * Ad triggers after level 2, 5, 8, 11… (i.e. every 3rd completion).
 */
/**
 * Show a Monetag rewarded interstitial on milestone levels (3, 6, 9, 12…).
 * Pass the 0-indexed level that was just completed.
 * Returns true if ad was shown and completed, false otherwise.
 */
export async function trackNextLevel(completedLevel: number): Promise<boolean> {
  // completedLevel is 0-indexed, so level 2 = "Level 3" displayed
  if ((completedLevel + 1) % 3 === 0) {
    return await showInterstitial();
  }
  return false;
}

async function showInterstitial(): Promise<boolean> {
  const sdkReady = await ensureMonetagSdk();
  if (!sdkReady || !window.show_10818525) {
    console.warn("[Monetag] SDK not available or not in Telegram WebApp");
    return false;
  }

  try {
    await window.show_10818525({ type: "inApp" });
    return true;
  } catch (e) {
    console.warn("[Monetag] Interstitial failed:", e);
    return false;
  }
}

/* ─── Rewarded Ad ─── */

/**
 * Show a Monetag rewarded ad.
 * Returns true if watched successfully, false if skipped/failed/unavailable.
 */
export async function showMonetangRewardAd(): Promise<boolean> {
  const sdkReady = await ensureMonetagSdk();
  if (!sdkReady || !window.show_10818525) {
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
