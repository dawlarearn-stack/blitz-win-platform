import { motion } from "framer-motion";
import { Trophy, Medal, Star, Users, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useGameStore, getPointsDollarValue } from "@/lib/gameStore";
import WeeklyInviteLeaderboard from "@/components/WeeklyInviteLeaderboard";
import { checkAndDistributeRewards } from "@/lib/weeklyLeaderboard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardPlayer {
  rank: number;
  name: string;
  points: number;
  gamesPlayed: number;
}

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

const Leaderboard = () => {
  const { data, addPoints } = useGameStore();
  const [topPlayers, setTopPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    checkAndDistributeRewards(addPoints);
  }, [addPoints]);

  // Fetch real top 10 players from database
  useEffect(() => {
    const fetchTopPlayers = async () => {
      try {
        // Get top 10 by points from user_game_state
        // Only show real Telegram users (numeric IDs) with points > 0
        const { data: gameStates, error } = await supabase
          .from("user_game_state")
          .select("telegram_id, points, games_played")
          .gt("points", 0)
          .not("telegram_id", "like", "guest_%")
          .not("telegram_id", "like", "dev-%")
          .order("points", { ascending: false })
          .limit(10);

        if (error) throw error;

        if (!gameStates || gameStates.length === 0) {
          setTopPlayers([]);
          setLoadingPlayers(false);
          return;
        }

        // Get usernames from bot_users
        const telegramIds = gameStates.map((s) => s.telegram_id);
        const { data: botUsers } = await supabase
          .from("bot_users")
          .select("telegram_id, username, first_name")
          .in("telegram_id", telegramIds);

        const userMap = new Map(
          (botUsers || []).map((u) => [u.telegram_id, u.username || u.first_name || `User-${u.telegram_id.slice(-4)}`])
        );

        setTopPlayers(
          gameStates.map((s, i) => ({
            rank: i + 1,
            name: userMap.get(s.telegram_id) || `Player-${s.telegram_id.slice(-4)}`,
            points: s.points,
            gamesPlayed: s.games_played,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
      setLoadingPlayers(false);
    };

    fetchTopPlayers();
  }, []);

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

          {loadingPlayers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : topPlayers.length === 0 ? (
            <div className="text-center py-12 gradient-card rounded-xl border border-border/50">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No players yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-2 mb-10">
              {topPlayers.map((player, i) => (
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
          )}

          {/* Weekly Invite Race */}
          <div className="mt-10">
            <WeeklyInviteLeaderboard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
