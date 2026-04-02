import { motion } from "framer-motion";
import { Timer, Trophy, Gift, UserPlus, Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useWeeklyCountdown,
  getRewardForRank,
} from "@/lib/weeklyLeaderboard";
import { useEffect, useState } from "react";
import { fetchWeeklyReferrals } from "@/lib/api";
import { getTelegramId } from "@/lib/fingerprint";

interface WeeklyInviter {
  rank: number;
  name: string;
  invites: number;
  telegramId: string;
}

const getRankEmoji = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return "border-yellow-400/30 bg-yellow-400/5";
  if (rank === 2) return "border-gray-300/20 bg-gray-300/5";
  if (rank === 3) return "border-amber-600/20 bg-amber-600/5";
  return "border-border/50";
};

const getGlow = (rank: number) => {
  if (rank === 1) return "0 0 20px hsl(50 100% 50% / 0.3)";
  if (rank === 2) return "0 0 15px hsl(0 0% 75% / 0.25)";
  if (rank === 3) return "0 0 15px hsl(30 80% 45% / 0.25)";
  return undefined;
};

function CountdownTimer() {
  const { days, hours, minutes, seconds } = useWeeklyCountdown();
  const units = [
    { label: "D", value: days },
    { label: "H", value: hours },
    { label: "M", value: minutes },
    { label: "S", value: seconds },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center">
          <span className="font-display text-lg font-black text-foreground bg-secondary/60 rounded-md px-2 py-0.5 min-w-[36px] text-center tabular-nums">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

function RewardBadge({ rank }: { rank: number }) {
  const reward = getRewardForRank(rank);
  if (!reward) return null;
  return (
    <span className="text-[10px] font-display font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
      +{reward.toLocaleString()}
    </span>
  );
}

export default function WeeklyInviteLeaderboard() {
  const [inviters, setInviters] = useState<WeeklyInviter[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInvites, setUserInvites] = useState(0);
  const currentUserId = getTelegramId();

  useEffect(() => {
    const fetchWeeklyInviters = async () => {
      try {
        const now = new Date();
        const day = now.getUTCDay();
        const diff = day === 0 ? 6 : day - 1;
        const weekStart = new Date(now);
        weekStart.setUTCHours(0, 0, 0, 0);
        weekStart.setUTCDate(weekStart.getUTCDate() - diff);

        const { referrals: weekReferrals, botUsers } = await fetchWeeklyReferrals(weekStart.toISOString());

        const countMap: Record<string, number> = {};
        for (const r of weekReferrals || []) {
          countMap[r.referrer_telegram_id] = (countMap[r.referrer_telegram_id] || 0) + 1;
        }

        const sorted = Object.entries(countMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 99);

        if (sorted.length === 0) {
          setInviters([]);
          setUserInvites(0);
          setLoading(false);
          return;
        }

        const userMap: Record<string, string> = {};
        for (const u of botUsers || []) {
          userMap[u.telegram_id] = u.username || u.first_name || u.telegram_id;
        }

        const result: WeeklyInviter[] = sorted.map(([id, count], i) => ({
          rank: i + 1,
          name: userMap[id] || id,
          invites: count,
          telegramId: id,
        }));

        setInviters(result);
        setUserInvites(countMap[currentUserId] || 0);
      } catch (err) {
        console.error("Failed to fetch weekly inviters:", err);
      }
      setLoading(false);
    };

    fetchWeeklyInviters();
  }, [currentUserId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
            Weekly Invite Race
          </h2>
        </div>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Top inviters earn bonus rewards every week. Top 10 win prizes!
      </p>

      {/* Countdown + Reward Info */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="gradient-card rounded-xl border border-primary/20 p-4"
          style={{ boxShadow: "0 0 25px hsl(var(--primary) / 0.1)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="font-display text-xs font-bold text-primary uppercase tracking-wider">
                Resets In
              </span>
            </div>
            <CountdownTimer />
          </div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-accent" />
            <span className="font-display text-xs font-bold text-accent uppercase tracking-wider">
              Prizes
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { label: "🥇 1st", pts: "20,000" },
              { label: "🥈 2nd", pts: "15,000" },
              { label: "🥉 3rd", pts: "10,000" },
              { label: "4-10th", pts: "5,000" },
            ].map((r) => (
              <div key={r.label} className="text-center bg-secondary/40 rounded-lg py-1.5 px-1">
                <p className="text-[10px] text-muted-foreground">{r.label}</p>
                <p className="font-display text-xs font-bold text-foreground">{r.pts}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* User's weekly stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="gradient-card rounded-xl border border-accent/30 p-3.5"
          style={{ boxShadow: "0 0 20px hsl(var(--accent) / 0.1)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-accent" />
              <span className="font-display text-xs font-bold text-accent">Your Weekly Invites</span>
            </div>
            <div className="text-right">
              <span className="font-display text-lg font-black text-foreground">{userInvites}</span>
              <span className="text-xs text-muted-foreground ml-1">this week</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scrollable Leaderboard */}
      <ScrollArea className="h-[420px] rounded-xl border border-border/50 gradient-card">
        <div className="space-y-1.5 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : inviters.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No inviters this week yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Share your referral link to compete!</p>
            </div>
          ) : (
            inviters.map((inviter, i) => {
              const emoji = getRankEmoji(inviter.rank);
              const glow = getGlow(inviter.rank);
              const hasReward = inviter.rank <= 10;
              return (
                <motion.div
                  key={inviter.rank}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.5) }}
                  className={`flex items-center gap-3 rounded-lg p-3 border ${getRankStyle(inviter.rank)} transition-colors`}
                  style={glow ? { boxShadow: glow } : undefined}
                >
                  <div className="w-7 text-center shrink-0">
                    {emoji ? (
                      <span className="text-base">{emoji}</span>
                    ) : (
                      <span className="text-xs font-display text-muted-foreground">{inviter.rank}</span>
                    )}
                  </div>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-display text-xs">
                      {inviter.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-bold text-foreground truncate">
                      @{inviter.name}
                    </p>
                    {hasReward && <RewardBadge rank={inviter.rank} />}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-sm font-bold text-primary">{inviter.invites}</p>
                    <p className="text-[10px] text-muted-foreground">invites</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
