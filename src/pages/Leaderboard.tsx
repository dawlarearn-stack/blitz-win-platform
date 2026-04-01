import { motion } from "framer-motion";
import { Trophy, Medal, Star, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useGameStore, getPointsDollarValue } from "@/lib/gameStore";
import WeeklyInviteLeaderboard from "@/components/WeeklyInviteLeaderboard";
import { checkAndDistributeRewards } from "@/lib/weeklyLeaderboard";
import { useEffect } from "react";

const MOCK_PLAYERS = [
  { rank: 1, name: "CyberKing", points: 28500, gamesPlayed: 342 },
  { rank: 2, name: "NeonQueen", points: 24200, gamesPlayed: 298 },
  { rank: 3, name: "PixelNinja", points: 21800, gamesPlayed: 276 },
  { rank: 4, name: "GlowMaster", points: 19400, gamesPlayed: 251 },
  { rank: 5, name: "ByteRunner", points: 17100, gamesPlayed: 230 },
  { rank: 6, name: "StarCoder", points: 15600, gamesPlayed: 210 },
  { rank: 7, name: "DarkWave", points: 13900, gamesPlayed: 195 },
  { rank: 8, name: "FlashHero", points: 12300, gamesPlayed: 178 },
  { rank: 9, name: "VoidWalker", points: 10800, gamesPlayed: 162 },
  { rank: 10, name: "LightPulse", points: 9500, gamesPlayed: 148 },
];

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-xs font-display text-muted-foreground w-5 text-center">{rank}</span>;
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return "border-yellow-400/30 bg-yellow-400/5";
  if (rank === 2) return "border-gray-300/20 bg-gray-300/5";
  if (rank === 3) return "border-amber-600/20 bg-amber-600/5";
  return "border-border/50";
};

const getRankEmoji = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

const getInviterGlow = (rank: number) => {
  if (rank === 1) return "0 0 20px hsl(50 100% 50% / 0.3)";
  if (rank === 2) return "0 0 15px hsl(0 0% 75% / 0.25)";
  if (rank === 3) return "0 0 15px hsl(30 80% 45% / 0.25)";
  return undefined;
};

const Leaderboard = () => {
  const { data, addPoints } = useGameStore();
  const userInvites = data.referrals.filter(
    (r) => r.gamesPlayed >= 50 && (Date.now() - r.joinedAt) / (1000 * 60 * 60 * 24) >= 3
  ).length;

  useEffect(() => {
    checkAndDistributeRewards(addPoints);
  }, [addPoints]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-20 px-4">
        <div className="container max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-7 h-7 text-primary" />
            <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground">Leaderboard</h1>
          </div>
          <p className="text-muted-foreground mb-6">Top players ranked by total points.</p>

          {/* Your Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="gradient-card rounded-2xl border border-primary/30 p-4 mb-6"
            style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Star className="w-5 h-5 text-primary" />
              <span className="font-display text-sm font-bold text-primary">Your Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="font-display text-lg font-black text-foreground">{data.points.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-black text-foreground">${getPointsDollarValue(data.points)}</p>
                <p className="text-xs text-muted-foreground">Balance</p>
              </div>
              <div className="text-center">
                <p className="font-display text-lg font-black text-foreground">{data.gamesPlayed}</p>
                <p className="text-xs text-muted-foreground">Played</p>
              </div>
            </div>
          </motion.div>

          {/* Top 10 Players */}
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">Top 10 Players</span>
          </div>

          <div className="space-y-2 mb-10">
            {MOCK_PLAYERS.map((player, i) => (
              <motion.div
                key={player.rank}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 gradient-card rounded-xl p-3.5 border ${getRankStyle(player.rank)}`}
              >
                <div className="w-8 flex items-center justify-center">
                  {getRankIcon(player.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-foreground truncate">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.gamesPlayed} games played</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-sm font-bold text-primary">{player.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Weekly Invite Race */}
          <div className="mt-10">
            <WeeklyInviteLeaderboard userInvites={userInvites} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
