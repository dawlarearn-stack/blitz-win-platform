import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

const EMOJI_PAIRS = [
  ["😀", "😃"], ["🐱", "🐈"], ["🍎", "🍏"], ["🔴", "🟠"], ["⭐", "🌟"],
  ["💙", "💎"], ["🟢", "🟩"], ["🌸", "🌺"], ["🐶", "🐕"], ["🎵", "🎶"],
  ["👀", "👁️"], ["🖤", "⬛"], ["🤍", "⬜"], ["🔵", "🫐"], ["🟡", "🟨"],
];

function getGridSize(level: number): number {
  if (level <= 10) return 4;
  if (level <= 30) return 5;
  if (level <= 60) return 6;
  return 7;
}

function getRoundsNeeded(level: number): number {
  return Math.min(3 + Math.floor(level * 0.1), 12);
}

function getTimePerRound(level: number): number {
  if (level <= 10) return 10;
  if (level <= 30) return 7;
  if (level <= 60) return 5;
  return 3;
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

function generateGrid(level: number) {
  const size = getGridSize(level);
  const total = size * size;
  const pair = EMOJI_PAIRS[Math.floor(Math.random() * EMOJI_PAIRS.length)];
  const oddIndex = Math.floor(Math.random() * total);
  const grid = Array.from({ length: total }, (_, i) => ({
    id: i,
    emoji: i === oddIndex ? pair[1] : pair[0],
    isOdd: i === oddIndex,
  }));
  return { grid, size };
}

const EmojiHunt = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["emoji-hunt"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [roundData, setRoundData] = useState(() => generateGrid(level));
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getTimePerRound(level));
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [feedback, setFeedback] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const roundsNeeded = getRoundsNeeded(level);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          playGameOver();
          setGameState("lost");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState, round]);

  const handleTap = (cell: { id: number; isOdd: boolean }) => {
    if (gameState !== "playing" || feedback !== null) return;
    if (cell.isOdd) {
      playClickSafe();
      setFeedback(cell.id);
      const newCorrect = correct + 1;
      setCorrect(newCorrect);
      clearInterval(timerRef.current);

      setTimeout(() => {
        setFeedback(null);
        if (newCorrect >= roundsNeeded) {
          playLevelWin();
          const pts = getPointsForLevel(level);
          setEarnedPoints(pts);
          addPoints(pts);
          updateProgress("emoji-hunt", level);
          setGameState("won");
        } else {
          setRound((r) => r + 1);
          setRoundData(generateGrid(level));
          setTimeLeft(getTimePerRound(level));
        }
      }, 500);
    } else {
      playClickBomb();
      setFeedback(cell.id);
      clearInterval(timerRef.current);
      setTimeout(() => { setFeedback(null); playGameOver(); setGameState("lost"); }, 500);
    }
  };

  const nextLevel = () => {
    const next = Math.min(level + 1, 100);
    setLevel(next);
    setRoundData(generateGrid(next));
    setRound(0);
    setCorrect(0);
    setTimeLeft(getTimePerRound(next));
    setGameState("playing");
    setEarnedPoints(0);
  };

  const retry = () => {
    setRoundData(generateGrid(level));
    setRound(0);
    setCorrect(0);
    setTimeLeft(getTimePerRound(level));
    setGameState("playing");
    setEarnedPoints(0);
  };

  return (
    <GameLayout title="Emoji Hunt" level={level} points={data.points}>
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-xs text-muted-foreground">Found: <span className="text-primary font-bold">{correct}/{roundsNeeded}</span></span>
          <span className={`text-xs font-bold ${timeLeft <= 3 ? "text-destructive" : "text-accent"}`}>{timeLeft}s</span>
        </div>

        <p className="text-center text-muted-foreground text-xs mb-3">Find the different emoji!</p>

        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${roundData.size}, 1fr)` }}>
          {roundData.grid.map((cell) => (
            <motion.button
              key={cell.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleTap(cell)}
              className="aspect-square rounded-xl cursor-pointer flex items-center justify-center text-2xl"
              style={{
                background: feedback === cell.id
                  ? cell.isOdd
                    ? "linear-gradient(145deg, hsl(160 80% 20%), hsl(160 60% 12%))"
                    : "linear-gradient(145deg, hsl(var(--destructive) / 0.3), hsl(var(--destructive) / 0.1))"
                  : "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
                border: `1.5px solid ${feedback === cell.id ? (cell.isOdd ? "hsl(160 80% 40%)" : "hsl(var(--destructive))") : "hsl(var(--border) / 0.4)"}`,
                boxShadow: feedback === cell.id && cell.isOdd ? "0 0 12px hsl(160 80% 50% / 0.4)" : "0 2px 6px hsl(0 0% 0% / 0.3)",
              }}
            >
              {cell.emoji}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {gameState !== "playing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4">
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🔍</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Sharp Eyes!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">Found {correct} odd ones</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">👀</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Missed!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Found {correct}/{roundsNeeded}</p>
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

export default EmojiHunt;
