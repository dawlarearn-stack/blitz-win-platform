import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw, Dice1 } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getWinsNeeded(level: number): number {
  return Math.min(3 + Math.floor(level * 0.07), 10);
}

function getPointsForLevel(level: number): number {
  if (level <= 9) return 35;
  if (level <= 19) return 55;
  if (level <= 39) return 75;
  if (level <= 59) return 95;
  if (level <= 79) return 115;
  if (level <= 89) return 150;
  return 175;
}

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const DiceRoll = () => {
  const { data, startLevel, completeLevel } = useGameStore();
  const progress = data.progress["dice-roll"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "rolling" | "won" | "lost">("idle");
  const [wins, setWins] = useState(0);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const winsNeeded = getWinsNeeded(level);

  const startGame = useCallback(() => {
    if (!spendEnergy(1)) return;
    setWins(0);
    setLastResult(null);
    setGameState("playing");
    setEarnedPoints(0);
    setDice([1, 1]);
  }, [spendEnergy]);

  const handleGuess = useCallback((guess: "high" | "low" | "seven") => {
    if (gameState !== "playing") return;
    setGameState("rolling");
    setLastResult(null);

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const total = d1 + d2;

    setTimeout(() => {
      setDice([d1, d2]);
      const actual = total === 7 ? "seven" : total > 7 ? "high" : "low";
      const correct = guess === actual;

      if (correct) {
        playClickSafe();
        setLastResult("correct");
        const newWins = wins + 1;
        setWins(newWins);
        if (newWins >= winsNeeded) {
          setTimeout(() => {
            playLevelWin();
            const pts = getPointsForLevel(level);
            setEarnedPoints(pts);
            addPoints(pts);
            updateProgress("dice-roll", level);
            setGameState("won");
          }, 500);
        } else {
          setTimeout(() => { setLastResult(null); setGameState("playing"); }, 1000);
        }
      } else {
        playClickBomb();
        setLastResult("wrong");
        setTimeout(() => { playGameOver(); setGameState("lost"); }, 600);
      }
    }, 700);
  }, [gameState, wins, winsNeeded, level, addPoints, updateProgress]);

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = () => { setGameState("idle"); };

  return (
    <GameLayout title="Dice Roll" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-sm">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
            <div className="text-6xl mb-4">🎲</div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Dice Roll</h2>
            <p className="text-muted-foreground text-sm mb-1">Get <span className="text-primary font-bold">{winsNeeded}</span> correct predictions</p>
            <p className="text-muted-foreground text-xs mb-6">Predict High, Low, or Seven!</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-10 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">START</button>
          </motion.div>
        )}

        {(gameState === "playing" || gameState === "rolling") && (<>
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-xs text-muted-foreground">Wins: <span className="text-primary font-bold">{wins}/{winsNeeded}</span></span>
          <span className="text-xs text-muted-foreground">+{getPointsForLevel(level)} pts</span>
        </div>

        <div className="text-center py-6">
          <div className="flex justify-center gap-6 mb-4">
            {dice.map((d, i) => (
              <motion.div
                key={i}
                animate={gameState === "rolling" ? { rotate: [0, 360, 720] } : {}}
                transition={{ duration: 0.6 }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl"
                style={{
                  background: "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
                  border: `2px solid ${lastResult === "correct" ? "hsl(160 80% 40%)" : lastResult === "wrong" ? "hsl(var(--destructive))" : "hsl(var(--border) / 0.5)"}`,
                  boxShadow: "0 6px 15px hsl(0 0% 0% / 0.4)",
                }}
              >
                {DICE_FACES[d - 1]}
              </motion.div>
            ))}
          </div>

          <p className="text-muted-foreground text-sm mb-1">Total: <span className="text-accent font-bold text-lg">{dice[0] + dice[1]}</span></p>
          {lastResult && <p className={`text-xs font-bold ${lastResult === "correct" ? "text-primary" : "text-destructive"}`}>{lastResult === "correct" ? "Correct! ✓" : "Wrong! ✗"}</p>}

          <p className="text-muted-foreground text-xs mt-4 mb-3">Predict: Will the total be High (8-12), Low (2-6), or exactly 7?</p>
          <div className="flex gap-3 justify-center">
            {(["low", "seven", "high"] as const).map((g) => (
              <motion.button
                key={g}
                whileTap={{ scale: 0.95 }}
                disabled={gameState !== "playing"}
                onClick={() => handleGuess(g)}
                className="px-5 py-3 rounded-xl font-display font-bold text-sm border border-border/50 hover:border-primary/40 transition-all disabled:opacity-50"
                style={{ background: "hsl(var(--secondary))" }}
              >
                {g === "low" ? "⬇️ Low" : g === "seven" ? "7️⃣ Seven" : "⬆️ High"}
              </motion.button>
            ))}
          </div>
        </div>
        </>)}

        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4">
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🎲</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Hot Streak!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">{wins} correct predictions</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">🎲</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Wrong Prediction!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Streak broken at {wins}</p>
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

export default DiceRoll;
