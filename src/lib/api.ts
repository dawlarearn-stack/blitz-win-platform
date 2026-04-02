/**
 * Centralized API client for the Node.js/MongoDB backend.
 * 
 * In production (Vultr), API_BASE is "" so calls go to /api/... on the same domain.
 * In development, set VITE_API_BASE to point to the backend server.
 * 
 * Falls back to Supabase Edge Functions if VITE_API_BASE is set to "supabase".
 */

const MODE = import.meta.env.VITE_API_MODE || "supabase"; // "supabase" | "selfhost"

// For self-hosted mode
const SELF_HOST_BASE = import.meta.env.VITE_API_BASE || "";

// For Supabase mode (current)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getUrl(endpoint: string): string {
  if (MODE === "selfhost") {
    return `${SELF_HOST_BASE}/api/${endpoint}`;
  }
  return `${SUPABASE_URL}/functions/v1/${endpoint}`;
}

function getHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (MODE === "supabase") {
    headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
  }
  return headers;
}

export async function apiPost<T = any>(endpoint: string, body: any, extra?: Record<string, string>): Promise<T> {
  const resp = await fetch(getUrl(endpoint), {
    method: "POST",
    headers: getHeaders(extra),
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data.error || `API error ${resp.status}`);
    (err as any).status = resp.status;
    (err as any).data = data;
    throw err;
  }
  return data as T;
}

export async function apiGet<T = any>(endpoint: string, params?: Record<string, string>, extra?: Record<string, string>): Promise<T> {
  const url = new URL(getUrl(endpoint), window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const resp = await fetch(url.toString(), {
    headers: getHeaders(extra),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data.error || `API error ${resp.status}`);
    (err as any).status = resp.status;
    (err as any).data = data;
    throw err;
  }
  return data as T;
}

/** Upload file - for self-hosted mode uses /api/upload, for Supabase uses storage */
export async function apiUploadFile(bucket: string, fileName: string, file: File): Promise<string | null> {
  if (MODE === "selfhost") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);
    formData.append("fileName", fileName);
    const resp = await fetch(`${SELF_HOST_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await resp.json();
    return data.url || null;
  }
  // Supabase storage
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: uploadData, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);
  if (error) {
    console.error("Upload error:", error);
    return null;
  }
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uploadData.path);
  return urlData.publicUrl;
}

/** Admin API helpers with admin key header */
export function adminHeaders(adminKey: string): Record<string, string> {
  return { "x-admin-key": adminKey };
}

export async function adminGet<T = any>(endpoint: string, adminKey: string, params?: Record<string, string>): Promise<T> {
  return apiGet<T>(endpoint, params, adminHeaders(adminKey));
}

export async function adminPost<T = any>(endpoint: string, adminKey: string, body: any): Promise<T> {
  return apiPost<T>(endpoint, body, adminHeaders(adminKey));
}

/** Fetch app_config values (works in both modes) */
export async function fetchAppConfig(keys: string[]): Promise<Record<string, any>> {
  if (MODE === "selfhost") {
    const data = await apiGet("config", { keys: keys.join(",") });
    return data;
  }
  // Supabase mode - direct query
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: configs } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", keys);
  const result: Record<string, any> = {};
  if (configs) {
    for (const c of configs) {
      result[c.key] = c.value;
    }
  }
  return result;
}

/** Fetch leaderboard data */
export async function fetchLeaderboard(): Promise<{ players: any[]; botUsers: any[] }> {
  if (MODE === "selfhost") {
    return apiGet("leaderboard");
  }
  // Supabase mode
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: gameStates } = await supabase
    .from("user_game_state")
    .select("telegram_id, points, games_played")
    .gt("points", 0)
    .not("telegram_id", "like", "guest_%")
    .not("telegram_id", "like", "dev-%")
    .order("points", { ascending: false })
    .limit(10);

  if (!gameStates || gameStates.length === 0) return { players: [], botUsers: [] };

  const telegramIds = gameStates.map((s) => s.telegram_id);
  const { data: botUsers } = await supabase
    .from("bot_users")
    .select("telegram_id, username, first_name")
    .in("telegram_id", telegramIds);

  return { players: gameStates, botUsers: botUsers || [] };
}

/** Fetch weekly referrals */
export async function fetchWeeklyReferrals(weekStartISO: string): Promise<{ referrals: any[]; botUsers: any[] }> {
  if (MODE === "selfhost") {
    return apiGet("weekly-referrals", { week_start: weekStartISO });
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: weekReferrals, error } = await supabase
    .from("referrals")
    .select("referrer_telegram_id")
    .gte("created_at", weekStartISO);

  if (error) throw error;

  const countMap: Record<string, number> = {};
  for (const r of weekReferrals || []) {
    countMap[r.referrer_telegram_id] = (countMap[r.referrer_telegram_id] || 0) + 1;
  }

  const sorted = Object.entries(countMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 99);

  if (sorted.length === 0) return { referrals: [], botUsers: [] };

  const topIds = sorted.map(([id]) => id);
  const { data: botUsers } = await supabase
    .from("bot_users")
    .select("telegram_id, username, first_name")
    .in("telegram_id", topIds);

  return {
    referrals: weekReferrals || [],
    botUsers: botUsers || [],
  };
}

/** Fetch withdrawal history */
export async function fetchWithdrawalHistory(telegramId: string): Promise<any[]> {
  if (MODE === "selfhost") {
    const data = await apiGet("withdrawal-history", { telegram_id: telegramId });
    return data.requests || [];
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}

/** Fetch payment history */
export async function fetchPaymentHistory(telegramId: string): Promise<any[]> {
  if (MODE === "selfhost") {
    const data = await apiGet("payment-history", { telegram_id: telegramId });
    return data.data || [];
  }
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const resp = await fetch(
    `${baseUrl}/functions/v1/check-payment?telegram_id=${telegramId}&all=true`,
    { headers: { "Authorization": `Bearer ${SUPABASE_KEY}` } }
  );
  const json = await resp.json();
  if (json.data) return Array.isArray(json.data) ? json.data : [json.data];
  return [];
}

/** Send heartbeat */
export async function sendHeartbeat(telegramId: string): Promise<void> {
  if (MODE === "selfhost") {
    await apiPost("heartbeat", { telegram_id: telegramId });
    return;
  }
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase.functions.invoke("heartbeat", {
    body: { telegram_id: telegramId },
  });
}
