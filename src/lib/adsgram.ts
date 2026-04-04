/**
 * AdsGram Rewarded Ads integration.
 * Only works inside the Telegram WebApp environment.
 * Block ID is fetched from app_config table (key: "adsgram_block_id").
 */

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Adsgram?: {
      init: (config: { blockId: string }) => AdController;
    };
  }
}

interface AdController {
  show: () => Promise<{ done: boolean; description: string; state: string; error: boolean }>;
}

const DEFAULT_BLOCK_ID = 26550;

let controller: AdController | null = null;
let cachedBlockId: number | null = null;

async function fetchBlockId(): Promise<number> {
  if (cachedBlockId !== null) return cachedBlockId;
  try {
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "adsgram_block_id")
      .maybeSingle();
    if (data?.value && typeof data.value === "number") {
      cachedBlockId = data.value;
      return cachedBlockId;
    }
  } catch (e) {
    console.warn("[AdsGram] Failed to fetch block ID from config:", e);
  }
  cachedBlockId = DEFAULT_BLOCK_ID;
  return cachedBlockId;
}

/** Call this when admin updates the block ID so the next ad uses the new one */
export function clearAdsgramCache() {
  cachedBlockId = null;
  controller = null;
}

function isTelegramWebApp(): boolean {
  return !!(window as any).Telegram?.WebApp?.initData;
}

async function getController(): Promise<AdController | null> {
  if (controller) return controller;
  if (!isTelegramWebApp() || !window.Adsgram) return null;
  try {
    const blockId = await fetchBlockId();
    controller = window.Adsgram.init({ blockId });
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
  const ctrl = await getController();
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
