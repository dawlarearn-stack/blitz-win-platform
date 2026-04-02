import { useEffect, useRef } from "react";
import { getTelegramId } from "@/lib/fingerprint";
import { sendHeartbeat } from "@/lib/api";

export function useHeartbeat(intervalMs = 60_000) {
  const sentRef = useRef(false);

  useEffect(() => {
    const telegramId = getTelegramId();
    if (telegramId === "unknown") return;

    const send = async () => {
      try {
        await sendHeartbeat(telegramId);
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    };

    if (!sentRef.current) {
      sentRef.current = true;
      send();
    }

    const interval = setInterval(send, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}
