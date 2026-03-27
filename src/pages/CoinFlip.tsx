import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getStreakNeeded(level: number): number {
  return Math.min(3 + Math.floor(level * 0.07), 10);
}

function getPointsForLevel(level: number): number {
  if (level <= 9) return 10;
  if (level <= 19) return 15;
  if (level <= 39) return 20;
  if (level <= 59) return 25;
  if (level <= 79) return 30;
  if (level <= 89) return 40;
  return 50;
}

const CoinFlip = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["coin-flip"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"playing" | "flipping" | "won" | "lost">("playing");
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [lastGuess, setLastGuess] = useState<"heads" | "tails" | null>(null);
  const streakNeeded = getStreakNeeded(level);

  const handleGuess = useCallback((guess: "heads" | "tails") => {
    if (gameState !== "playing") return;
    setGameState("flipping");
    setLastGuess(guess);
    const outcome = Math.random() < 0.5 ? "heads" : "tails";

    setTimeout(() => {
      setResult(outcome);
      if (guess === outcome) {
        playClickSafe();
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak >= streakNeeded) {
          playLevelWin();
          const pts = getPointsForLevel(level);
          setEarnedPoints(pts);
          addPoints(pts);
          updateProgress("coin-flip", level);
          setGameState("won");
        } else {
          setTimeout(() => { setResult(null); setGameState("playing"); }, 800);
        }
      } else {
        playClickBomb();
        setTimeout(() => { playGameOver(); setGameState("lost"); }, 600);
      }
    }, 800);
  }, [gameState, streak, streakNeeded, level, addPoints, updateProgress]);

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setStreak(0); setResult(null); setLastGuess(null); setGameState("playing"); setEarnedPoints(0); };
  const retry = () => { setStreak(0); setResult(null); setLastGuess(null); setGameState("playing"); setEarnedPoints(0); };

  return (
    <GameLayout title="Coin Flip" level={level} points={data.points}>
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-xs text-muted-foreground">Streak: <span className="text-primary font-bold">{streak}/{streakNeeded}</span></span>
          <span className="text-xs text-muted-foreground">+{getPointsForLevel(level)} pts</span>
        </div>

        <div className="text-center py-8">
          <motion.div
            animate={gameState === "flipping" ? { rotateY: [0, 720] } : {}}
            transition={{ duration: 0.8 }}
            className="w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center text-5xl"
            style={{
              background: result === "heads" ? "linear-gradient(145deg, hsl(45 90% 55%), hsl(45 80% 40%))" : result === "tails" ? "linear-gradient(145deg, hsl(210 30% 50%), hsl(210 20% 35%))" : "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--muted)))",
              border: "3px solid hsl(var(--border))",
              boxShadow: "0 8px 20px hsl(0 0% 0% / 0.4)",
            }}
          >
            {result ? (result === "heads" ? "👑" : "🔢") : "🪙"}
          </motion.div>

          {result && gameState !== "flipping" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-display font-bold text-accent mb-4 uppercase">
              {result}! {lastGuess === result ? "✓" : "✗"}
            </motion.p>
          )}

          {(gameState === "playing" || gameState === "flipping") && (
            <div className="flex gap-4 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={gameState === "flipping"}
                onClick={() => handleGuess("heads")}
                className="px-8 py-4 rounded-xl font-display font-bold text-sm border border-border/50 hover:border-primary/40 transition-all disabled:opacity-50"
                style={{ background: "hsl(45 90% 55% / 0.1)", color: "hsl(45 90% 55%)" }}
              >
                👑 Heads
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={gameState === "flipping"}
                onClick={() => handleGuess("tails")}
                className="px-8 py-4 rounded-xl font-display font-bold text-sm border border-border/50 hover:border-primary/40 transition-all disabled:opacity-50"
                style={{ background: "hsl(210 30% 50% / 0.1)", color: "hsl(210 30% 60%)" }}
              >
                🔢 Tails
              </motion.button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4">
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🪙</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Lucky Streak!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">{streak} correct in a row</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">😢</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Wrong Guess!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Streak broken at {streak}</p>
                    <button onClick={retry} className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-colors"><RotateCcw className="w-4 h-4" /> RETRY</button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameLayout>
  );
};

export default CoinFlip;
