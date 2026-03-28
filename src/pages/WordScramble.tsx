import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw, Type } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

const WORDS_POOL = [
  "game", "play", "coin", "star", "fire", "gold", "hero", "luck", "dice", "card",
  "bomb", "grid", "maze", "bolt", "glow", "dash", "jump", "spin", "flip", "rush",
  "pixel", "cyber", "blast", "speed", "power", "level", "point", "score", "combo", "chain",
  "bonus", "prize", "quest", "match", "block", "tower", "world", "fight", "magic", "storm",
  "crypto", "wallet", "token", "stake", "yield", "trade", "vault", "forge", "quest", "realm",
];

function getWordsNeeded(level: number): number {
  return Math.min(3 + Math.floor(level * 0.1), 12);
}

function getTimeLimit(level: number): number {
  if (level <= 10) return 90;
  if (level <= 30) return 70;
  if (level <= 60) return 50;
  return 35;
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

function scramble(word: string): string {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join("");
  return result === word ? scramble(word) : result;
}

const WordScramble = () => {
  const { data, addPoints, spendEnergy, updateProgress } = useGameStore();
  const progress = data.progress["word-scramble"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [currentWord, setCurrentWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const wordsNeeded = getWordsNeeded(level);

  const pickWord = useCallback(() => {
    const pool = level > 30 ? WORDS_POOL : WORDS_POOL.filter((w) => w.length <= 5);
    const word = pool[Math.floor(Math.random() * pool.length)];
    setCurrentWord(word);
    setScrambled(scramble(word));
    setInput("");
  }, [level]);

  const startGame = useCallback(() => {
    if (!spendEnergy(1)) return;
    setGameState("playing");
    setSolved(0);
    setTimeLeft(getTimeLimit(level));
    setEarnedPoints(0);
    pickWord();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [level, pickWord]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); playGameOver(); setGameState("lost"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  const handleInput = (value: string) => {
    if (gameState !== "playing") return;
    setInput(value);
    if (value.toLowerCase().trim() === currentWord) {
      playClickSafe();
      setFeedback("correct");
      setTimeout(() => setFeedback(null), 300);
      const newSolved = solved + 1;
      setSolved(newSolved);
      if (newSolved >= wordsNeeded) {
        clearInterval(timerRef.current);
        playLevelWin();
        const pts = getPointsForLevel(level);
        setEarnedPoints(pts);
        addPoints(pts);
        updateProgress("word-scramble", level);
        setGameState("won");
      } else {
        pickWord();
      }
    }
  };

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = () => setGameState("idle");

  return (
    <GameLayout title="Word Scramble" level={level} points={data.points}>
      <div className="w-full max-w-sm">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <Type className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Word Scramble</h2>
            <p className="text-muted-foreground text-sm mb-6">Unscramble {wordsNeeded} words in {getTimeLimit(level)}s</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">START</button>
          </motion.div>
        )}

        {gameState === "playing" && (
          <>
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs text-muted-foreground">Words: <span className="text-primary font-bold">{solved}/{wordsNeeded}</span></span>
              <span className={`text-xs font-bold ${timeLeft <= 10 ? "text-destructive" : "text-accent"}`}>{timeLeft}s</span>
            </div>

            <motion.div
              key={scrambled}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center py-8 mb-4 rounded-2xl border border-border/50"
              style={{ background: feedback === "correct" ? "hsl(160 80% 20% / 0.2)" : "hsl(var(--secondary))" }}
            >
              <div className="flex justify-center gap-2">
                {scrambled.split("").map((letter, i) => (
                  <span key={i} className="w-10 h-12 flex items-center justify-center rounded-lg font-display text-2xl font-black text-primary" style={{ background: "hsl(var(--background))", border: "1.5px solid hsl(var(--primary) / 0.3)" }}>
                    {letter.toUpperCase()}
                  </span>
                ))}
              </div>
            </motion.div>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              className="w-full py-4 px-4 rounded-xl bg-secondary border border-border/50 text-center text-foreground font-display text-xl font-bold focus:outline-none focus:border-primary/60 transition-colors"
              placeholder="Type the word..."
              autoComplete="off"
              autoCapitalize="off"
            />
          </>
        )}

        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4">
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">📝</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Word Master!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">Unscrambled {solved} words</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">⏰</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Time's Up!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Unscrambled {solved}/{wordsNeeded}</p>
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

export default WordScramble;
