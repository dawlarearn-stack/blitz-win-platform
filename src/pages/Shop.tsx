import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Zap, ShoppingCart, ArrowRightLeft, CreditCard, Banknote, History } from "lucide-react";
import MMKPaymentFlow from "@/components/MMKPaymentFlow";
import USDPaymentFlow from "@/components/USDPaymentFlow";
import PaymentHistory from "@/components/PaymentHistory";
import Navbar from "@/components/Navbar";
import { useGameStore, getPointsDollarValue } from "@/lib/gameStore";
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

const energyPacks: EnergyPack[] = [
  { energy: 1300, priceUSD: "$1", priceMMK: "4,500 KS" },
  { energy: 4200, priceUSD: "$3", priceMMK: "12,900 KS" },
  { energy: 7500, priceUSD: "$5", priceMMK: "19,900 KS" },
  { energy: 17000, priceUSD: "$10", priceMMK: "38,900 KS" },
];

interface ConversionOption {
  energy: number;
  pointsCost: number;
}

const conversions: ConversionOption[] = [
  { energy: 50, pointsCost: 3000 },
  { energy: 100, pointsCost: 5500 },
  { energy: 200, pointsCost: 10000 },
  { energy: 500, pointsCost: 24000 },
];

type ModalType = "convert" | null;

const Shop = () => {
  const { data, addEnergy, spendPoints } = useGameStore();
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedPack, setSelectedPack] = useState<EnergyPack | null>(null);
  const [selectedConversion, setSelectedConversion] = useState<ConversionOption | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [mmkFlowOpen, setMmkFlowOpen] = useState(false);
  const [mmkFlowPack, setMmkFlowPack] = useState<EnergyPack | null>(null);
  const [usdFlowOpen, setUsdFlowOpen] = useState(false);
  const [usdFlowPack, setUsdFlowPack] = useState<EnergyPack | null>(null);

  const openBuy = (pack: EnergyPack, type: "usd" | "wavepay") => {
    if (type === "wavepay") {
      setMmkFlowPack(pack);
      setMmkFlowOpen(true);
      return;
    }
    if (type === "usd") {
      setUsdFlowPack(pack);
      setUsdFlowOpen(true);
      return;
    }
  };

  const openConvert = (conv: ConversionOption) => {
    setSelectedConversion(conv);
    setSelectedPack(null);
    setResultMsg(null);
    setModal("convert");
  };

  const handleConvert = () => {
    if (!selectedConversion) return;
    const ok = spendPoints(selectedConversion.pointsCost);
    if (ok) {
      addEnergy(selectedConversion.energy);
      setResultMsg(`✅ +${selectedConversion.energy} Energy ရရှိပါပြီ!`);
    } else {
      setResultMsg("❌ Points မလုံလောက်ပါ");
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-20 px-4">
        <div className="container max-w-lg">
          {/* Balance Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="gradient-card rounded-2xl p-5 border border-border/50 neon-border mb-6"
          >
            <p className="text-muted-foreground text-xs mb-3 font-display">MY BALANCE</p>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <Coins className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{data.points.toLocaleString()}</p>
                <p className="text-muted-foreground text-[10px]">Points</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <Zap className="w-6 h-6 text-accent mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{data.energy.toLocaleString()}</p>
                <p className="text-muted-foreground text-[10px]">Energy</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-lg">💵</span>
                <p className="font-display text-lg font-bold text-foreground">${getPointsDollarValue(data.points)}</p>
                <p className="text-muted-foreground text-[10px]">Value</p>
              </div>
            </div>
          </motion.div>

          <h1 className="font-display text-xl font-bold text-foreground mb-1 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> Shop
          </h1>
          <p className="text-muted-foreground text-xs mb-6">Energy ဝယ်ယူပြီး ဂိမ်းကစားပါ</p>

          {/* USD Purchases */}
          <Section title="Buy Energy (USD)" icon={<CreditCard className="w-4 h-4 text-primary" />}>
            <div className="grid grid-cols-2 gap-3">
              {energyPacks.map((pack) => (
                <PackCard
                  key={pack.priceUSD}
                  energy={pack.energy}
                  price={pack.priceUSD}
                  onClick={() => openBuy(pack, "usd")}
                  delay={0}
                />
              ))}
            </div>
          </Section>

          {/* MMK Purchases */}
          <Section title="Buy Energy (MMK)" icon={<Banknote className="w-4 h-4 text-accent" />}>
            <div className="grid grid-cols-2 gap-3">
              {energyPacks.map((pack) => (
                <PackCard
                  key={pack.priceMMK}
                  energy={pack.energy}
                  price={pack.priceMMK}
                  accent
                  onClick={() => openBuy(pack, "wavepay")}
                  delay={0}
                />
              ))}
            </div>
          </Section>

          {/* Points → Energy */}
          <Section title="Points → Energy" icon={<ArrowRightLeft className="w-4 h-4 text-primary" />}>
            <div className="grid grid-cols-2 gap-3">
              {conversions.map((conv) => (
                <motion.button
                  key={conv.energy}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openConvert(conv)}
                  className="gradient-card rounded-xl p-4 border border-border/50 hover:border-primary/40 transition-all text-left"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-display text-sm font-bold text-foreground">+{conv.energy}</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] font-display">{conv.pointsCost.toLocaleString()} pts</p>
                </motion.button>
              ))}
            </div>
          </Section>

          {/* Payment History - at the bottom */}
          <Section title="Payment History" icon={<History className="w-4 h-4 text-primary" />}>
            <PaymentHistory />
          </Section>
        </div>
      </div>

      {/* MMK Payment Flow */}
      <MMKPaymentFlow
        open={mmkFlowOpen}
        onOpenChange={setMmkFlowOpen}
        pack={mmkFlowPack}
        onComplete={() => setMmkFlowOpen(false)}
      />

      {/* USD Payment Flow */}
      <USDPaymentFlow
        open={usdFlowOpen}
        onOpenChange={setUsdFlowOpen}
        pack={usdFlowPack}
        onComplete={() => setUsdFlowOpen(false)}
      />

      {/* Confirmation Modal (USD & Points) */}
      <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="gradient-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              {resultMsg ? "Result" : "Points → Energy ပြောင်းမလား?"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {resultMsg ? (
                <span className="text-base">{resultMsg}</span>
              ) : selectedConversion ? (
                <>
                  <span className="text-primary font-bold">{selectedConversion.pointsCost.toLocaleString()} Points</span> သုံးပြီး{" "}
                  <span className="text-accent font-bold">+{selectedConversion.energy} Energy</span> ရယူမလား?
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            {resultMsg ? (
              <Button className="w-full gradient-primary text-primary-foreground font-display" onClick={() => setModal(null)}>
                OK
              </Button>
            ) : (
              <>
                <Button variant="outline" className="flex-1 font-display" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground font-display"
                  onClick={handleConvert}
                >
                  Confirm
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Sub-components ─── */

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <h2 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </motion.section>
  );
}

function PackCard({
  energy,
  price,
  accent,
  onClick,
  delay,
}: {
  energy: number;
  price: string;
  accent?: boolean;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`gradient-card rounded-xl p-4 border transition-all text-left ${
        accent ? "border-accent/30 hover:border-accent/60" : "border-border/50 hover:border-primary/40"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className={`w-4 h-4 ${accent ? "text-accent" : "text-primary"}`} />
        <span className="font-display text-sm font-bold text-foreground">+{energy.toLocaleString()}</span>
      </div>
      <p className={`text-xs font-display font-bold ${accent ? "text-accent" : "text-primary"}`}>{price}</p>
    </motion.button>
  );
}

export default Shop;
