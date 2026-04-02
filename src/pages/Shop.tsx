import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Zap, ShoppingCart, ArrowRightLeft, CreditCard, Banknote, History, Loader2 } from "lucide-react";
import { showMonetangRewardAd } from "@/lib/monetag";
import { toast } from "sonner";
import { getTelegramId } from "@/lib/fingerprint";
import MMKPaymentFlow from "@/components/MMKPaymentFlow";
import USDPaymentFlow from "@/components/USDPaymentFlow";
import PaymentHistory from "@/components/PaymentHistory";
import Navbar from "@/components/Navbar";
import { useGameStore, getPointsDollarValue } from "@/lib/gameStore";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EnergyPack {
  energy: number;
  priceUSD: string;
  priceMMK: string;
}

interface ConversionOption {
  energy: number;
  pointsCost: number;
}

// Default fallbacks
const defaultEnergyPacks: EnergyPack[] = [
  { energy: 1300, priceUSD: "$1", priceMMK: "4,500 KS" },
  { energy: 4200, priceUSD: "$3", priceMMK: "12,900 KS" },
  { energy: 7500, priceUSD: "$5", priceMMK: "19,900 KS" },
  { energy: 17000, priceUSD: "$10", priceMMK: "38,900 KS" },
];

const defaultConversions: ConversionOption[] = [
  { energy: 50, pointsCost: 3000 },
  { energy: 100, pointsCost: 5500 },
  { energy: 200, pointsCost: 10000 },
  { energy: 500, pointsCost: 24000 },
];

type ModalType = "convert" | null;

const Shop = () => {
  const { data, refreshState } = useGameStore();
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedConversion, setSelectedConversion] = useState<ConversionOption | null>(null);
  const [converting, setConverting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [mmkFlowOpen, setMmkFlowOpen] = useState(false);
  const [mmkPack, setMmkPack] = useState<{ energy: number; priceMMK: string } | null>(null);
  const [usdFlowOpen, setUsdFlowOpen] = useState(false);
  const [usdPack, setUsdPack] = useState<{ energy: number; priceUSD: string } | null>(null);

  // Dynamic pricing from DB
  const [energyPacks, setEnergyPacks] = useState<EnergyPack[]>(defaultEnergyPacks);
  const [conversions, setConversions] = useState<ConversionOption[]>(defaultConversions);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data: configs } = await supabase
          .from("app_config")
          .select("key, value")
          .in("key", ["energy_packs", "point_conversions"]);

        if (configs) {
          for (const c of configs) {
            if (c.key === "energy_packs" && Array.isArray(c.value)) {
              setEnergyPacks(c.value as unknown as EnergyPack[]);
            }
            if (c.key === "point_conversions" && Array.isArray(c.value)) {
              setConversions(c.value as unknown as ConversionOption[]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch pricing:", err);
      }
    };
    fetchPricing();
  }, []);

  const openBuy = (pack: EnergyPack, type: "usd" | "wavepay") => {
    if (type === "usd") {
      setUsdPack({ energy: pack.energy, priceUSD: pack.priceUSD });
      setUsdFlowOpen(true);
    } else {
      setMmkPack({ energy: pack.energy, priceMMK: pack.priceMMK });
      setMmkFlowOpen(true);
    }
  };

  const openConvert = (conv: ConversionOption) => {
    setSelectedConversion(conv);
    setResultMsg(null);
    setModal("convert");
  };

  const handleConvert = async () => {
    if (!selectedConversion || converting) return;
    setConverting(true);
    try {
      // Show Monetag rewarded ad first
      const adWatched = await showMonetangRewardAd();
      if (!adWatched) {
        setResultMsg("❌ Ad ကိုကြည့်ပြီးမှ Convert လုပ်လို့ရပါမည်");
        setConverting(false);
        return;
      }

      // Server-side conversion
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const telegramId = getTelegramId();
      
      const resp = await fetch(`${baseUrl}/functions/v1/convert-points`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          points_cost: selectedConversion.pointsCost,
          energy_amount: selectedConversion.energy,
        }),
      });
      const result = await resp.json();

      if (!resp.ok) {
        if (result.error?.includes("Insufficient")) {
          setResultMsg("❌ Points မလုံလောက်ပါ");
        } else {
          setResultMsg(`❌ ${result.error || "Convert မအောင်မြင်ပါ"}`);
        }
        return;
      }

      // Refresh state from server
      await refreshState();
      setResultMsg(`✅ ${selectedConversion.energy} Energy ရရှိပါပြီ!`);
    } catch (err) {
      setResultMsg("❌ Server error. ထပ်ကြိုးစားပါ");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6 pb-20 px-4">
        <div className="container max-w-md">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6">
            <ShoppingCart className="w-8 h-8 text-primary mx-auto mb-2" />
            <h1 className="font-display text-2xl font-bold text-foreground">Energy Shop</h1>
            <p className="text-muted-foreground text-xs mt-1">Energy ဝယ်ယူပြီး ဂိမ်းတွေကိုကစားပါ</p>
          </motion.div>

          {/* Balance */}
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="gradient-card rounded-2xl p-4 border border-border/50 mb-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider">Balance</p>
              <p className="font-display text-lg font-bold text-foreground">{data.points.toLocaleString()} pts</p>
              <p className="text-muted-foreground text-[10px]">≈ {getPointsDollarValue(data.points)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider">Energy</p>
              <p className="font-display text-lg font-bold text-primary">{data.energy.toLocaleString()} ⚡</p>
            </div>
          </motion.div>

          {/* USD Section */}
          <Section title="Buy with USD (Binance)" icon={<CreditCard className="w-4 h-4 text-primary" />}>
            {energyPacks.map((pack, i) => (
              <PackCard key={i} energy={pack.energy} price={pack.priceUSD} onClick={() => openBuy(pack, "usd")} delay={i * 0.05} />
            ))}
          </Section>

          {/* MMK Section */}
          <Section title="Buy with MMK (KPay / WavePay)" icon={<Banknote className="w-4 h-4 text-accent" />}>
            {energyPacks.map((pack, i) => (
              <PackCard key={i} energy={pack.energy} price={pack.priceMMK} accent onClick={() => openBuy(pack, "wavepay")} delay={i * 0.05} />
            ))}
          </Section>

          {/* Convert Points */}
          <Section title="Convert Points → Energy" icon={<ArrowRightLeft className="w-4 h-4 text-primary" />}>
            {conversions.map((conv, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="gradient-card rounded-xl p-3 border border-border/50 flex items-center justify-between"
                onClick={() => openConvert(conv)}>
                <div>
                  <p className="font-display text-sm font-bold text-foreground">+{conv.energy} Energy</p>
                  <p className="text-muted-foreground text-[10px]">{conv.pointsCost.toLocaleString()} Points</p>
                </div>
                <Button size="sm" variant="outline" className="font-display text-xs">Convert</Button>
              </motion.div>
            ))}
          </Section>

          {/* Payment History */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-display font-bold text-foreground uppercase tracking-wider">Recent Purchases</p>
            </div>
            <PaymentHistory />
          </div>
        </div>
      </div>

      {/* MMK Payment Flow */}
      <MMKPaymentFlow open={mmkFlowOpen} onOpenChange={setMmkFlowOpen} pack={mmkPack} onComplete={() => setMmkFlowOpen(false)} />

      {/* USD Payment Flow */}
      <USDPaymentFlow open={usdFlowOpen} onOpenChange={setUsdFlowOpen} pack={usdPack} onComplete={() => setUsdFlowOpen(false)} />

      {/* Convert Dialog */}
      <Dialog open={modal === "convert"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="gradient-card border-border/50 max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Points → Energy</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {selectedConversion && `${selectedConversion.pointsCost.toLocaleString()} Points → +${selectedConversion.energy} Energy`}
            </DialogDescription>
          </DialogHeader>
          {resultMsg ? (
            <div className="text-center py-4">
              <p className="font-display text-sm text-foreground">{resultMsg}</p>
              <Button className="mt-3 font-display text-xs" variant="outline" onClick={() => setModal(null)}>Close</Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 font-display text-xs" onClick={() => setModal(null)}>Cancel</Button>
              <Button className="flex-1 gradient-primary text-primary-foreground font-display text-xs" onClick={handleConvert}>Convert</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Navbar />
    </div>
  );
};

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-xs font-display font-bold text-foreground uppercase tracking-wider">{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PackCard({ energy, price, accent, onClick, delay }: {
  energy: number; price: string; accent?: boolean; onClick: () => void; delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      className="gradient-card rounded-xl p-3 border border-border/50 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all"
      onClick={onClick}>
      <div className="flex items-center gap-2">
        <Zap className={`w-4 h-4 ${accent ? "text-accent" : "text-primary"}`} />
        <span className="font-display text-sm font-bold text-foreground">+{energy.toLocaleString()} Energy</span>
      </div>
      <span className={`font-display text-sm font-bold ${accent ? "text-accent" : "text-primary"}`}>{price}</span>
    </motion.div>
  );
}

export default Shop;
