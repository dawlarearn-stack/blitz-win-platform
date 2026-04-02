import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, Zap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchPaymentHistory } from "@/lib/api";

interface PaymentRecord {
  id: string;
  energy_amount: number;
  price_mmk: string;
  payment_method: "kpay" | "wavepay" | "binance";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  receipt_last4: string;
}

function getTelegramId(): string {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) return String(tg.initDataUnsafe.user.id);
  } catch {}
  return localStorage.getItem("pgr_telegram_id") || "";
}

const statusConfig = {
  pending: { icon: Clock, label: "Pending", className: "bg-muted text-muted-foreground" },
  approved: { icon: CheckCircle, label: "Approved", className: "bg-primary/20 text-primary" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-destructive/20 text-destructive" },
} as const;

export default function PaymentHistory() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    const telegramId = getTelegramId();
    if (!telegramId) { setLoading(false); return; }

    setLoading(true);
    try {
      const data = await fetchPaymentHistory(telegramId);
      setRecords(data);
    } catch (err) {
      console.error("Failed to fetch payment history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  if (loading) {
    return (
      <div className="text-center py-6">
        <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground text-xs font-display">ငွေလွှဲမှတ်တမ်းမရှိသေးပါ</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span />
        <button onClick={fetchHistory} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {records.map((r, i) => {
        const cfg = statusConfig[r.status];
        const Icon = cfg.icon;
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="gradient-card rounded-xl p-3 border border-border/50 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-display text-sm font-bold text-foreground">+{r.energy_amount.toLocaleString()}</span>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-display">
                  {r.payment_method.toUpperCase()} • {r.price_mmk} • #{r.receipt_last4}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.className}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </Badge>
          </motion.div>
        );
      })}
    </div>
  );
}
