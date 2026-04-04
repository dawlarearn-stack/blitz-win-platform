import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";
import { showRewardAd } from "@/lib/adsgram";
import { trackNextLevel } from "@/lib/monetag";

const COLORS = [
  { name: "Red", hsl: "0 80% 55%" },
  { name: "Blue", hsl: "220 80% 55%" },
  { name: "Green", hsl: "140 70% 45%" },
  { name: "Yellow", hsl: "50 90% 55%" },
  { name: "Purple", hsl: "280 70% 55%" },
  { name: "Orange", hsl: "30 90% 55%" },
  { name: "Pink", hsl: "330 80% 60%" },
  { name: "Cyan", hsl: "185 80% 50%" },
];

function getRoundsNeeded(level: number): number {
  return Math.min(5 + Math.floor(level * 0.15), 20);
}

function getTimePerRound(level: number): number {
  if (level <= 10) return 5;
  if (level <= 30) return 4;
  if (level <= 60) return 3;
  return 2;
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

function pickRandom<T>(arr: T[], exclude?: T): T {
  const filtered = exclude ? arr.filter((a) => a !== exclude) : arr;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

const ColorMatch = () => {
  const { data, loading, startLevel, completeLevel } = useGameStore();
  const progress = data.progress["color-match"];
  const [level, setLevel] = useState(0);
  useEffect(() => { if (!loading && progress?.currentLevel != null) setLevel(progress.currentLevel); }, [loading, progress?.currentLevel]);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wordColor, setWordColor] = useState(COLORS[0]);
  const [textColor, setTextColor] = useState(COLORS[1]);
  const [options, setOptions] = useState<typeof COLORS>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const roundsNeeded = getRoundsNeeded(level);

  const generateRound = useCallback(() => {
    const word = pickRandom(COLORS);
    const text = pickRandom(COLORS, word);
    setWordColor(word);
    setTextColor(text);
    const correctOption = text;
    const otherOptions = COLORS.filter((c) => c !== correctOption).sort(() => Math.random() - 0.5).slice(0, 3);
    const all = [correctOption, ...otherOptions].sort(() => Math.random() - 0.5);
    setOptions(all);
    setTimeLeft(getTimePerRound(level));
  }, [level]);

  const startGame = useCallback(async () => {
    const ok = await startLevel("color-match", level);
    if (!ok) return;
    setGameState("playing");
    setRound(0);
    setCorrect(0);
    setEarnedPoints(0);
    generateRound();
  }, [generateRound, startLevel, level]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          playClickBomb();
          setFeedback("wrong");
          setTimeout(() => {
            setFeedback(null);
            playGameOver();
            setGameState("lost");
            completeLevel("color-match", level, false);
          }, 500);
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState, round]);

  const handleAnswer = (color: typeof COLORS[0]) => {
    if (gameState !== "playing" || feedback) return;
    clearInterval(timerRef.current);

    if (color.name === textColor.name) {
      playClickSafe();
      setFeedback("correct");
      const newCorrect = correct + 1;
      setCorrect(newCorrect);
      setTimeout(() => {
        setFeedback(null);
        if (newCorrect >= roundsNeeded) {
          playLevelWin();
          const pts = getPointsForLevel(level);
          setEarnedPoints(pts);
          completeLevel("color-match", level, true);
          setGameState("won");
        } else {
          setRound((r) => r + 1);
          generateRound();
        }
      }, 400);
    } else {
      playClickBomb();
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        playGameOver();
        setGameState("lost");
        completeLevel("color-match", level, false);
      }, 500);
    }
  };

  const nextLevel = async () => { await trackNextLevel(level); setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = async () => { await showRewardAd(); setGameState("idle"); };

  return (
    <GameLayout title="Color Match" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-sm">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Color Match</h2>
            <p className="text-muted-foreground text-sm mb-6">Tap the color the word is <strong>displayed in</strong>, not what it says!</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">START</button>
          </motion.div>
        )}

        {gameState === "playing" && (
          <>
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs text-muted-foreground">Round: <span className="text-primary font-bold">{correct}/{roundsNeeded}</span></span>
              <span className={`text-xs font-bold ${timeLeft <= 2 ? "text-destructive" : "text-accent"}`}>{timeLeft}s</span>
            </div>

            <motion.div
              key={round}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10 mb-6 rounded-2xl border border-border/50"
              style={{
                background: feedback === "correct" ? "hsl(160 80% 20% / 0.2)" : feedback === "wrong" ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--secondary))",
                transition: "background 0.3s",
              }}
            >
              <span className="font-display text-4xl font-black select-none" style={{ color: `hsl(${textColor.hsl})` }}>
                {wordColor.name}
              </span>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {options.map((color) => (
                <motion.button
                  key={color.name}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnswer(color)}
                  className="py-4 rounded-xl font-display font-bold text-sm border border-border/50 hover:border-primary/40 transition-all"
                  style={{ background: `hsl(${color.hsl} / 0.15)`, color: `hsl(${color.hsl})` }}
                >
                  {color.name}
                </motion.button>
              ))}
            </div>
          </>
        )}

        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4">
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🎨</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Perfect!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">{correct} correct answers</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">❌</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Wrong!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Got {correct}/{roundsNeeded} correct</p>
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

export default ColorMatch;
