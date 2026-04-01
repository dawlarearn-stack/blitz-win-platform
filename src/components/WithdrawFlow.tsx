import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Banknote, ArrowRight, Wallet, Building2, Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function getTelegramId(): string {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) return String(tg.initDataUnsafe.user.id);
  } catch {}
  return localStorage.getItem("pgr_telegram_id") || "unknown";
}

type Currency = "USD" | "MMK" | null;
type USDMethod = "binance_id" | "bep20" | null;
type MMKMethod = "kbz_pay" | "wave_pay" | null;
type Step = "currency" | "method" | "details" | "confirm" | "submitted";

interface WithdrawFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: number;
  dollarValue: string;
  onComplete: (pointsSpent: number) => void;
}

export default function WithdrawFlow({ open, onOpenChange, points, dollarValue, onComplete }: WithdrawFlowProps) {
  const [step, setStep] = useState<Step>("currency");
  const [currency, setCurrency] = useState<Currency>(null);
  const [usdMethod, setUsdMethod] = useState<USDMethod>(null);
  const [mmkMethod, setMMKMethod] = useState<MMKMethod>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [binanceAccountName, setBinanceAccountName] = useState("");
  const [binanceUid, setBinanceUid] = useState("");
  const [bep20Address, setBep20Address] = useState("");
  const [accountName, setAccountName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const usdNum = parseFloat(dollarValue);
  const mmkValue = (points / 500000) * 20000;

  const reset = () => {
    setStep("currency");
    setCurrency(null);
    setUsdMethod(null);
    setMMKMethod(null);
    setBinanceAccountName("");
    setBinanceUid("");
    setBep20Address("");
    setAccountName("");
    setPhoneNumber("");
    setSubmitting(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const selectCurrency = (c: Currency) => {
    setCurrency(c);
    if (c === "USD") {
      // Auto-select method based on amount
      if (usdNum >= 10) {
        setUsdMethod("bep20");
        setStep("details");
      } else {
        setUsdMethod("binance_id");
        setStep("details");
      }
    } else {
      setStep("method");
    }
  };

  const selectMMKMethod = (m: MMKMethod) => {
    setMMKMethod(m);
    setStep("details");
  };

  const getWithdrawalMethod = (): string => {
    if (currency === "USD") return usdMethod || "binance_id";
    return mmkMethod || "kbz_pay";
  };

  const isDetailsValid = (): boolean => {
    const method = getWithdrawalMethod();
    if (method === "binance_id") return binanceAccountName.trim().length > 0 && binanceUid.trim().length > 0;
    if (method === "bep20") return bep20Address.trim().length > 5;
    if (method === "kbz_pay" || method === "wave_pay") return accountName.trim().length > 0 && phoneNumber.trim().length > 0;
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const method = getWithdrawalMethod();
      const body: any = {
        telegram_id: getTelegramId(),
        withdrawal_method: method,
        amount_points: points,
        currency,
      };

      if (currency === "USD") {
        body.amount_usd = dollarValue;
      } else {
        body.amount_mmk = mmkValue.toLocaleString() + " MMK";
      }

      if (method === "binance_id") {
        body.binance_account_name = binanceAccountName.trim();
        body.binance_uid = binanceUid.trim();
      } else if (method === "bep20") {
        body.bep20_address = bep20Address.trim();
      } else {
        body.account_name = accountName.trim();
        body.phone_number = phoneNumber.trim();
      }

      const { data, error } = await supabase.functions.invoke("submit-withdrawal", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep("submitted");
      onComplete(points);
      toast.success("Withdrawal request submitted!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Withdrawal request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel = (): string => {
    const m = getWithdrawalMethod();
    const labels: Record<string, string> = {
      binance_id: "Binance ID",
      bep20: "BEP20 (BSC)",
      kbz_pay: "KBZ Pay",
      wave_pay: "WavePay",
    };
    return labels[m] || m;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gradient-card border-border/50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            {step === "submitted" ? "Request Submitted" : "Withdraw Earnings"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {step === "submitted"
              ? "Admin က စစ်ဆေးပြီး အတည်ပြုပေးပါမယ်"
              : `${points.toLocaleString()} points · $${dollarValue} · ${mmkValue.toLocaleString()} MMK`}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Currency Selection */}
          {step === "currency" && (
            <motion.div key="currency" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-sm text-muted-foreground font-display">ထုတ်ယူလိုသော ငွေကြေးအမျိုးအစားရွေးပါ</p>
              <button
                onClick={() => selectCurrency("USD")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-all gradient-card"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-display font-bold text-sm text-foreground">USD (Binance)</p>
                  <p className="text-xs text-muted-foreground">${dollarValue}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => selectCurrency("MMK")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-accent/50 transition-all gradient-card"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
                  <Banknote className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-display font-bold text-sm text-foreground">MMK (KBZ/Wave)</p>
                  <p className="text-xs text-muted-foreground">{mmkValue.toLocaleString()} MMK</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </motion.div>
          )}

          {/* Step 2: MMK Method Selection */}
          {step === "method" && currency === "MMK" && (
            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-sm text-muted-foreground font-display">ငွေလက်ခံမည့် နည်းလမ်းရွေးပါ</p>
              {[
                { id: "kbz_pay" as MMKMethod, label: "KBZ Pay", icon: Building2, color: "text-primary" },
                { id: "wave_pay" as MMKMethod, label: "WavePay", icon: Smartphone, color: "text-accent" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMMKMethod(m.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/50 transition-all gradient-card"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                    <m.icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                  <p className="font-display font-bold text-sm text-foreground">{m.label}</p>
                  <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>
              ))}
              <Button variant="outline" size="sm" className="w-full font-display" onClick={() => setStep("currency")}>
                ← Back
              </Button>
            </motion.div>
          )}

          {/* Step 3: Details Form */}
          {step === "details" && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* USD - Binance ID */}
              {usdMethod === "binance_id" && (
                <>
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        $5 ~ $9.99 Binance ID (Internal Transfer) ဖြင့်သာ ထုတ်ယူနိုင်ပါသည်
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-display">Binance Account Name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Kyaw Min Oo"
                      value={binanceAccountName}
                      onChange={(e) => setBinanceAccountName(e.target.value)}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-display">Binance UID <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. 788364201"
                      value={binanceUid}
                      onChange={(e) => setBinanceUid(e.target.value)}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                </>
              )}

              {/* USD - BEP20 */}
              {usdMethod === "bep20" && (
                <>
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        $10+ BEP20 (BSC Network) Address ဖြင့် ထုတ်ယူနိုင်ပါသည်
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-display">BEP20 Wallet Address <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="0x..."
                      value={bep20Address}
                      onChange={(e) => setBep20Address(e.target.value)}
                      className="bg-muted/50 border-border/50 font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {/* MMK - KBZ/Wave */}
              {(mmkMethod === "kbz_pay" || mmkMethod === "wave_pay") && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-display">Account Name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Kyaw Min Oo"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-display">ဖုန်းနံပါတ် <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="09xxxxxxxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                </>
              )}

              <div className="rounded-lg border border-border/50 p-3 space-y-1">
                <DetailRow label="Currency" value={currency === "USD" ? `$${dollarValue}` : `${mmkValue.toLocaleString()} MMK`} />
                <DetailRow label="Points" value={points.toLocaleString()} />
                <DetailRow label="Method" value={methodLabel()} />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 font-display"
                  onClick={() => {
                    if (currency === "MMK") setStep("method");
                    else setStep("currency");
                  }}
                >
                  ← Back
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground font-display"
                  disabled={!isDetailsValid() || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting..." : "Withdraw"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Submitted */}
          {step === "submitted" && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-primary/10">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <p className="font-display text-sm font-bold text-foreground">Withdrawal Request Submitted!</p>
              <p className="text-xs text-muted-foreground">
                Admin က စစ်ဆေးပြီး Approve လုပ်ပေးပါမယ်။<br />
                Telegram မှာ Notification ရပါမယ်။
              </p>
              <Button className="gradient-primary text-primary-foreground font-display" onClick={() => handleOpenChange(false)}>
                OK
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs font-display">{label}</span>
      <span className="text-foreground text-sm font-display font-bold">{value}</span>
    </div>
  );
}
