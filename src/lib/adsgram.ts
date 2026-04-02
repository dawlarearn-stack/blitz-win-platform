/**
 * AdsGram Rewarded Ads integration.
 * Only works inside the Telegram WebApp environment.
 */

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: number }) => AdController;
    };
  }
}

interface AdController {
  show: () => Promise<{ done: boolean; description: string; state: string; error: boolean }>;
}

const BLOCK_ID = 26550;

let controller: AdController | null = null;

function isTelegramWebApp(): boolean {
  return !!(window as any).Telegram?.WebApp?.initData;
}

function getController(): AdController | null {
  if (controller) return controller;
  if (!isTelegramWebApp() || !window.Adsgram) return null;
  try {
    controller = window.Adsgram.init({ blockId: BLOCK_ID });
    return controller;
  } catch (e) {
    console.warn("[AdsGram] Init failed:", e);
    return null;
  }
}

/**
 * Show a rewarded ad.
 * Returns true if the ad was watched successfully, false if skipped/failed/unavailable.
 */
export async function showRewardAd(): Promise<boolean> {
  const ctrl = getController();
  if (!ctrl) {
    console.warn("[AdsGram] SDK not available or not in Telegram WebApp");
    return false;
  }
  try {
    const result = await ctrl.show();
    return result.done && !result.error;
  } catch (e) {
    console.warn("[AdsGram] Ad show failed:", e);
    return false;
  }
}
