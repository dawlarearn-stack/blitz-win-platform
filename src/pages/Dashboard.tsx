import { motion } from "framer-motion";
import { Coins, Gamepad2, Trophy, DollarSign } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useGameStore, getPointsDollarValue } from "@/lib/gameStore";

const Dashboard = () => {
  const { data } = useGameStore();
  const dollarValue = getPointsDollarValue(data.points);
  const canWithdraw = parseFloat(dollarValue) >= 5;

  const stats = [
    { icon: Coins, label: "Total Points", value: data.points.toLocaleString(), color: "text-primary" },
    { icon: DollarSign, label: "Balance", value: `$${dollarValue}`, color: "text-accent" },
    { icon: Gamepad2, label: "Games Played", value: data.gamesPlayed.toString(), color: "text-primary" },
    { icon: Trophy, label: "Games Unlocked", value: Object.keys(data.progress).length.toString(), color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-20 px-4">
        <div className="container max-w-3xl">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground mb-8">Track your earnings and game progress.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="gradient-card rounded-2xl p-5 border border-border/50"
              >
                <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
                <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
                <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Withdraw */}
          <div className="gradient-card rounded-2xl p-6 border border-border/50 text-center">
            <h2 className="font-display text-sm font-bold text-foreground mb-2">Withdraw Earnings</h2>
            <p className="text-muted-foreground text-xs mb-4">
              100,000 points = $1 · Minimum withdraw: $5
            </p>
            <button
              disabled={!canWithdraw}
              className={`font-display text-sm font-bold px-8 py-3 rounded-xl transition-all ${
                canWithdraw
                  ? "gradient-primary text-primary-foreground neon-glow hover:scale-105"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              {canWithdraw ? `WITHDRAW $${dollarValue}` : `Need $${(5 - parseFloat(dollarValue)).toFixed(2)} more`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
