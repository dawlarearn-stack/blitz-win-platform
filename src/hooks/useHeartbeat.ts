import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

function getTelegramId(): string {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) return String(tg.initDataUnsafe.user.id);
  } catch {}
  return localStorage.getItem("pgr_telegram_id") || "unknown";
}

export function useHeartbeat(intervalMs = 60_000) {
  const sentRef = useRef(false);

  useEffect(() => {
    const telegramId = getTelegramId();
    if (telegramId === "unknown") return;

    const send = async () => {
      try {
        await supabase.functions.invoke("heartbeat", {
          body: { telegram_id: telegramId },
        });
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    };

    // Send immediately on mount
    if (!sentRef.current) {
      sentRef.current = true;
      send();
    }

    const interval = setInterval(send, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}
