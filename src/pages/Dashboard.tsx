import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gamepad2, Trophy, DollarSign, Zap, Users, Copy, Check, Gift, Clock, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useGameStore, getPointsDollarValue } from "@/lib/gameStore";
import type { Referral } from "@/lib/gameStore";
import WithdrawFlow from "@/components/WithdrawFlow";

// Demo referrals for UI preview (remove when backend is live)
const DEMO_REFERRALS: Referral[] = [
  { id: "r1", username: "CyberNinja", gamesPlayed: 50, joinedAt: Date.now() - 4 * 86400000, claimed: false },
  { id: "r2", username: "NeonKing", gamesPlayed: 32, joinedAt: Date.now() - 2 * 86400000, claimed: false },
  { id: "r3", username: "PixelHero", gamesPlayed: 50, joinedAt: Date.now() - 5 * 86400000, claimed: true },
  { id: "r4", username: "StarGamer", gamesPlayed: 12, joinedAt: Date.now() - 1 * 86400000, claimed: false },
];

function getReferralStatus(r: Referral): "completed" | "pending" {
  const daysSince = (Date.now() - r.joinedAt) / (1000 * 60 * 60 * 24);
  return r.gamesPlayed >= 50 && daysSince >= 3 ? "completed" : "pending";
}

function getDaysRemaining(r: Referral): number {
  const daysSince = (Date.now() - r.joinedAt) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(3 - daysSince));
}

const Dashboard = () => {
  const { data, claimReferral, spendPoints } = useGameStore();
  const dollarValue = getPointsDollarValue(data.points);
  const canWithdraw = parseFloat(dollarValue) >= 5;
  const [copied, setCopied] = useState(false);
  const [referralExpanded, setReferralExpanded] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  // Use demo referrals if no real ones exist
  const referrals = data.referrals.length > 0 ? data.referrals : DEMO_REFERRALS;
  const referralLink = `https://t.me/PGRGameBot?start=${data.referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for Telegram WebApp
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaim = (id: string) => {
    setClaimingId(id);
    // Simulate optional ad delay
    setTimeout(() => {
      claimReferral(id);
      setClaimingId(null);
    }, 1200);
  };

  const stats = [
    { icon: Coins, label: "Total Points", value: data.points.toLocaleString(), color: "text-primary" },
    { icon: DollarSign, label: "Balance", value: `$${dollarValue}`, color: "text-accent" },
    { icon: Zap, label: "Energy", value: data.energy.toLocaleString(), color: "text-primary" },
    { icon: Gamepad2, label: "Games Played", value: data.gamesPlayed.toString(), color: "text-accent" },
    { icon: Trophy, label: "Games Unlocked", value: Object.keys(data.progress).length.toString(), color: "text-primary" },
    { icon: Users, label: "Referrals", value: referrals.length.toString(), color: "text-accent" },
  ];

  const completedCount = referrals.filter((r) => getReferralStatus(r) === "completed" && !r.claimed).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-20 px-4">
        <div className="container max-w-3xl">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground mb-8 text-sm">Track your earnings and game progress.</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="gradient-card rounded-2xl p-4 border border-border/50"
              >
                <s.icon className={`w-5 h-5 ${s.color} mb-1.5`} />
                <p className="text-muted-foreground text-[10px] mb-0.5">{s.label}</p>
                <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Withdraw */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="gradient-card rounded-2xl p-6 border border-border/50 text-center mb-6"
          >
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
          </motion.div>

          {/* Referrals & Rewards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="gradient-card rounded-2xl border border-border/50 overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setReferralExpanded(!referralExpanded)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.15)" }}>
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-foreground">Referrals & Rewards</h2>
                  <p className="text-[10px] text-muted-foreground">
                    {completedCount > 0 ? `${completedCount} reward${completedCount > 1 ? "s" : ""} claimable!` : "Invite friends to earn rewards"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {completedCount > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground">
                    {completedCount}
                  </span>
                )}
                {referralExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {referralExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-4">
                    {/* Referral Link */}
                    <div className="rounded-xl border border-border/50 p-3" style={{ background: "hsl(var(--secondary))" }}>
                      <p className="text-[10px] text-muted-foreground mb-2 font-display font-bold uppercase tracking-wider">Your Referral Link</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono truncate border border-border/30 bg-background/50 text-foreground">
                          {referralLink}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={handleCopy}
                          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: copied ? "hsl(160 80% 30%)" : "hsl(var(--primary))",
                          }}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-primary-foreground" />
                          ) : (
                            <Copy className="w-4 h-4 text-primary-foreground" />
                          )}
                        </motion.button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Code: <span className="font-display font-bold text-primary">{data.referralCode}</span>
                      </p>
                    </div>

                    {/* Reward Info */}
                    <div className="flex items-center gap-2 px-1">
                      <Gift className="w-4 h-4 text-accent flex-shrink-0" />
                      <p className="text-[10px] text-muted-foreground">
                        Earn <span className="text-primary font-bold">1,000 pts</span> + <span className="text-primary font-bold">100 ⚡</span> per friend who plays 50 games in 3 days
                      </p>
                    </div>

                    {/* Referred Friends List */}
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-display font-bold uppercase tracking-wider px-1">
                        Referred Friends ({referrals.length})
                      </p>

                      {referrals.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No referrals yet. Share your link!</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {referrals.map((r, i) => {
                            const status = getReferralStatus(r);
                            const daysLeft = getDaysRemaining(r);
                            const progress = Math.min(r.gamesPlayed, 50);
                            const progressPct = (progress / 50) * 100;
                            const canClaim = status === "completed" && !r.claimed;
                            const isClaiming = claimingId === r.id;

                            return (
                              <motion.div
                                key={r.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="rounded-xl border border-border/40 p-3"
                                style={{ background: "hsl(var(--secondary) / 0.5)" }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold"
                                      style={{
                                        background: status === "completed"
                                          ? "hsl(var(--primary) / 0.2)"
                                          : "hsl(var(--muted) / 0.3)",
                                        color: status === "completed"
                                          ? "hsl(var(--primary))"
                                          : "hsl(var(--muted-foreground))",
                                      }}
                                    >
                                      {r.username.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-display font-bold text-foreground">{r.username}</p>
                                      <div className="flex items-center gap-1">
                                        {r.claimed ? (
                                          <span className="text-[9px] text-muted-foreground">✓ Claimed</span>
                                        ) : status === "completed" ? (
                                          <span className="text-[9px] text-primary font-bold">● Completed</span>
                                        ) : (
                                          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                            <Clock className="w-2.5 h-2.5" />
                                            {daysLeft > 0 ? `${daysLeft}d left` : "Pending games"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Claim Button */}
                                  {r.claimed ? (
                                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted/30">
                                      <Check className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-[10px] text-muted-foreground font-display font-bold">CLAIMED</span>
                                    </div>
                                  ) : canClaim ? (
                                    <motion.button
                                      whileTap={{ scale: 0.93 }}
                                      onClick={() => handleClaim(r.id)}
                                      disabled={isClaiming}
                                      className="gradient-primary text-primary-foreground font-display text-[10px] font-bold px-3 py-1.5 rounded-lg neon-glow hover:scale-105 transition-transform disabled:opacity-60"
                                    >
                                      {isClaiming ? (
                                        <motion.span
                                          animate={{ opacity: [1, 0.4, 1] }}
                                          transition={{ repeat: Infinity, duration: 0.8 }}
                                        >
                                          CLAIMING...
                                        </motion.span>
                                      ) : (
                                        "CLAIM"
                                      )}
                                    </motion.button>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground font-display">Pending</span>
                                  )}
                                </div>

                                {/* Progress Bar */}
                                {!r.claimed && (
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] text-muted-foreground">Games played</span>
                                      <span className="text-[9px] font-display font-bold text-foreground">{progress} / 50</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPct}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.1 }}
                                        className="h-full rounded-full"
                                        style={{
                                          background: progressPct >= 100
                                            ? "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))"
                                            : "hsl(var(--primary) / 0.6)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;