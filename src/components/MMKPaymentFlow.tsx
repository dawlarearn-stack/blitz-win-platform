import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, Upload, CheckCircle, AlertCircle, Send, ArrowLeft, Copy, Image } from "lucide-react";
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
import { apiPost, apiUploadFile } from "@/lib/api";

interface EnergyPack {
  energy: number;
  priceMMK: string;
}

interface MMKPaymentFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pack: EnergyPack | null;
  onComplete: () => void;
}

type Step = "method" | "details" | "receipt" | "submitted";

const PAYMENT_ACCOUNTS = {
  kpay: { name: "Kyaw Min Oo", phone: "09791844522" },
  wavepay: { name: "Kyaw Min Oo", phone: "09890137756" },
} as const;

function getTelegramId(): string {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) return String(tg.initDataUnsafe.user.id);
  } catch {}
  // Fallback for non-Telegram environment
  let id = localStorage.getItem("pgr_telegram_id");
  if (!id) {
    id = "guest_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("pgr_telegram_id", id);
  }
  return id;
}

function CountdownTimer({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const r = expiresAt - Date.now();
      setRemaining(r > 0 ? r : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="flex items-center gap-2 text-accent font-display text-sm">
      <Clock className="w-4 h-4" />
      <span>{mins}:{secs.toString().padStart(2, "0")}</span>
    </div>
  );
}

export default function MMKPaymentFlow({ open, onOpenChange, pack, onComplete }: MMKPaymentFlowProps) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<"kpay" | "wavepay" | null>(null);
  const [receiptLast4, setReceiptLast4] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("method");
      setMethod(null);
      setReceiptLast4("");
      setSenderName("");
      setSenderPhone("");
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setRequestId(null);
      setExpiresAt(Date.now() + 60 * 60 * 1000);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const handleSubmit = async () => {
    if (!pack || !method || !receiptLast4 || !senderName || !senderPhone) {
      toast.error("အချက်အလက်အားလုံးဖြည့်ပါ");
      return;
    }
    if (receiptLast4.length !== 4) {
      toast.error("ပြေစာ ID နောက်ဆုံး ၄ လုံး ထည့်ပါ");
      return;
    }

    setSubmitting(true);
    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshotFile) {
        const ext = screenshotFile.name.split(".").pop();
        const fileName = `${getTelegramId()}_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("payment-screenshots")
          .upload(fileName, screenshotFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("payment-screenshots")
            .getPublicUrl(uploadData.path);
          screenshotUrl = urlData.publicUrl;
        }
      }

      // Submit payment request via edge function
      const { data, error } = await supabase.functions.invoke("submit-payment", {
        body: {
          telegram_id: getTelegramId(),
          energy_amount: pack.energy,
          price_mmk: pack.priceMMK,
          payment_method: method,
          receipt_last4: receiptLast4,
          sender_name: senderName,
          sender_phone: senderPhone,
          screenshot_url: screenshotUrl,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }

      setRequestId(data.id);
      setStep("submitted");
      toast.success("တင်ပြီးပါပြီ! Admin စစ်ဆေးနေပါသည်");
    } catch (err: any) {
      console.error(err);
      toast.error("တင်၍မရပါ။ ထပ်ကြိုးစားပါ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    toast.info("Admin ထံ ထပ်ပို့ပြီးပါပြီ");
  };

  if (!pack) return null;

  const account = method ? PAYMENT_ACCOUNTS[method] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="gradient-card border-border/50 max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Energy ဝယ်ယူခြင်း — +{pack.energy.toLocaleString()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {pack.priceMMK}
          </DialogDescription>
        </DialogHeader>

        {/* Countdown */}
        {step !== "submitted" && (
          <div className="flex items-center justify-between px-1">
            <span className="text-muted-foreground text-xs">Process Timeout</span>
            <CountdownTimer expiresAt={expiresAt} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: Choose payment method */}
          {step === "method" && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <p className="text-foreground text-sm font-display">ငွေလွှဲနည်းရွေးပါ</p>
              <div className="grid grid-cols-2 gap-3">
                {(["kpay", "wavepay"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMethod(m); setStep("details"); }}
                    className={`gradient-card rounded-xl p-4 border transition-all text-center hover:border-primary/60 ${
                      method === m ? "border-primary neon-border" : "border-border/50"
                    }`}
                  >
                    <p className="font-display text-sm font-bold text-foreground">
                      {m === "kpay" ? "KPay" : "WavePay"}
                    </p>
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full font-display" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </motion.div>
          )}

          {/* STEP 2: Show payment details */}
          {step === "details" && account && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="gradient-card rounded-xl p-4 border border-border/50 space-y-3">
                <DetailRow label="Account Name" value={account.name} onCopy={() => copyToClipboard(account.name)} />
                <DetailRow label="ဖုန်းနံပါတ်" value={account.phone} onCopy={() => copyToClipboard(account.phone)} />
                <DetailRow label="လွှဲရမယ့်ငွေ" value={pack.priceMMK} />
              </div>
              <div className="rounded-lg bg-accent/10 border border-accent/20 p-3">
                <p className="text-accent text-xs font-display">
                  ⚠️ ငွေလွှဲရာတွင် Note မှာ <span className="font-bold">Shopping/Payments</span> လို့သာရေးရန်
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-display" onClick={() => setStep("method")}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button className="flex-1 gradient-primary text-primary-foreground font-display" onClick={() => setStep("receipt")}>
                  ငွေလွှဲပြီးပါပြီ
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Fill receipt info */}
          {step === "receipt" && (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-display">ပြေစာ ID နောက်ဆုံး ၄ လုံး</Label>
                <Input
                  placeholder="e.g. 1234"
                  maxLength={4}
                  value={receiptLast4}
                  onChange={(e) => setReceiptLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-display">ငွေလွှဲသူ Account Name</Label>
                <Input
                  placeholder="Account Name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-display">ငွေလွှဲသူ ဖုန်းနံပါတ်</Label>
                <Input
                  placeholder="09xxxxxxxxx"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-display">ငွေလွှဲပြေစာ Screenshot <span className="text-destructive">*</span></Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gradient-card rounded-xl p-4 border border-dashed border-border/50 hover:border-primary/40 transition-all flex flex-col items-center gap-2"
                >
                  {screenshotPreview ? (
                    <img src={screenshotPreview} alt="Screenshot" className="w-full max-h-32 object-contain rounded-lg" />
                  ) : (
                    <>
                      <Image className="w-6 h-6 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs font-display">ဓါတ်ပုံတင်ရန် နှိပ်ပါ</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-display" onClick={() => setStep("details")}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground font-display"
                  onClick={handleSubmit}
                  disabled={submitting || !receiptLast4 || !senderName || !senderPhone || !screenshotFile}
                >
                  {submitting ? "Submitting..." : "Confirm"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Submitted / waiting */}
          {step === "submitted" && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center py-4"
            >
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <div>
                <p className="font-display text-foreground font-bold">တင်ပြီးပါပြီ!</p>
                <p className="text-muted-foreground text-xs mt-1">Admin စစ်ဆေးပြီး Approve လုပ်ပေးပါမည်</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-muted-foreground text-xs">Process Timeout</span>
                <CountdownTimer expiresAt={expiresAt} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-display" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 font-display border-accent/30 text-accent hover:bg-accent/10"
                  onClick={handleResend}
                >
                  <Send className="w-4 h-4" /> Resend
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-[10px] font-display">{label}</p>
        <p className="text-foreground text-sm font-display font-bold">{value}</p>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
