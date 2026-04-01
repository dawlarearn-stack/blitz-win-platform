import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawalRequest {
  id: string;
  amount_points: number;
  amount_usd: string | null;
  amount_mmk: string | null;
  currency: string;
  withdrawal_method: string;
  status: string;
  created_at: string;
}

function getTelegramId(): string {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) return String(tg.initDataUnsafe.user.id);
  } catch {}
  return localStorage.getItem("pgr_telegram_id") || "unknown";
}

const methodLabels: Record<string, string> = {
  binance_id: "Binance ID",
  bep20: "BEP20",
  kbz_pay: "KBZ Pay",
  wave_pay: "WavePay",
};

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending" },
  approved: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Rejected" },
};

export default function WithdrawalHistory() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const telegramId = getTelegramId();
      if (telegramId === "unknown") {
        setRequests([]);
        return;
      }
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id, amount_points, amount_usd, amount_mmk, currency, withdrawal_method, status, created_at")
        .eq("telegram_id", telegramId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("Failed to fetch withdrawal history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="gradient-card rounded-2xl border border-border/50 p-5">
        <p className="text-xs text-muted-foreground text-center animate-pulse">Loading withdrawal history...</p>
      </div>
    );
  }

  if (requests.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="gradient-card rounded-2xl border border-border/50 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <p className="text-xs font-display font-bold text-foreground uppercase tracking-wider">Withdrawal History</p>
        <button onClick={fetchHistory} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {requests.map((req, i) => {
          const cfg = statusConfig[req.status] || statusConfig.pending;
          const StatusIcon = cfg.icon;
          const amountDisplay = req.currency === "USD" ? `$${req.amount_usd}` : `${req.amount_mmk}`;
          const date = new Date(req.created_at);
          const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-border/40 p-3"
              style={{ background: "hsl(var(--secondary) / 0.5)" }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                  <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div>
                  <p className="text-xs font-display font-bold text-foreground">{amountDisplay}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {methodLabels[req.withdrawal_method] || req.withdrawal_method} · {dateStr}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-display font-bold ${cfg.color}`}>{cfg.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
