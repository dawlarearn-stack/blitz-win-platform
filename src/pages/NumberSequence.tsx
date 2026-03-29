import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getOptionsCount(level: number): number {
  if (level <= 10) return 3;
  if (level <= 30) return 4;
  if (level <= 60) return 5;
  return 6;
}

function getRoundsNeeded(level: number): number {
  return Math.min(3 + Math.floor(level * 0.08), 10);
}

function getTimeLimit(level: number): number {
  if (level <= 10) return 15;
  if (level <= 30) return 12;
  if (level <= 60) return 10;
  return 8;
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

type SequenceType = "add" | "multiply" | "subtract" | "mixed";

function getSequenceType(level: number): SequenceType {
  if (level <= 10) return "add";
  if (level <= 25) return Math.random() < 0.5 ? "add" : "subtract";
  if (level <= 50) return Math.random() < 0.3 ? "multiply" : Math.random() < 0.5 ? "add" : "subtract";
  return "mixed";
}

function generateSequence(level: number): { sequence: number[]; answer: number; options: number[] } {
  const type = getSequenceType(level);
  const len = Math.min(4 + Math.floor(level / 20), 7);
  let seq: number[] = [];
  let answer: number;

  if (type === "add") {
    const start = Math.floor(Math.random() * 20) + 1;
    const step = Math.floor(Math.random() * 10) + 2;
    for (let i = 0; i < len; i++) seq.push(start + step * i);
    answer = start + step * len;
  } else if (type === "subtract") {
    const step = Math.floor(Math.random() * 8) + 2;
    const start = 50 + Math.floor(Math.random() * 50) + step * len;
    for (let i = 0; i < len; i++) seq.push(start - step * i);
    answer = start - step * len;
  } else if (type === "multiply") {
    const base = Math.floor(Math.random() * 5) + 2;
    const mult = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < len; i++) seq.push(base * Math.pow(mult, i));
    answer = base * Math.pow(mult, len);
  } else {
    const start = Math.floor(Math.random() * 10) + 1;
    const step1 = Math.floor(Math.random() * 5) + 1;
    const step2 = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < len; i++) seq.push(start + (i % 2 === 0 ? step1 * Math.ceil((i + 1) / 2) : step2 * Math.ceil((i + 1) / 2)));
    const nextI = len;
    answer = start + (nextI % 2 === 0 ? step1 * Math.ceil((nextI + 1) / 2) : step2 * Math.ceil((nextI + 1) / 2));
  }

  const optCount = getOptionsCount(level);
  const opts = new Set<number>();
  opts.add(answer);
  while (opts.size < optCount) {
    const offset = Math.floor(Math.random() * 20) - 10;
    const fake = answer + (offset === 0 ? 1 : offset);
    if (fake !== answer) opts.add(fake);
  }
  const options = Array.from(opts).sort(() => Math.random() - 0.5);

  return { sequence: seq, answer, options };
}

const NumberSequence = () => {
  const { data, addPoints, spendEnergy, updateProgress } = useGameStore();
  const progress = data.progress["number-sequence"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [puzzle, setPuzzle] = useState(() => generateSequence(level));
  const [timeLeft, setTimeLeft] = useState(getTimeLimit(level));
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [feedback, setFeedback] = useState<number | null>(null);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
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

  const handleAnswer = useCallback((val: number) => {
    if (gameState !== "playing" || feedback !== null) return;
    setFeedback(val);

    if (val === puzzle.answer) {
      playClickSafe();
      setFeedbackCorrect(true);
      const newCorrect = correct + 1;
      setCorrect(newCorrect);
      clearInterval(timerRef.current);

      setTimeout(() => {
        setFeedback(null);
        setFeedbackCorrect(false);
        if (newCorrect >= roundsNeeded) {
          playLevelWin();
          const pts = getPointsForLevel(level);
          setEarnedPoints(pts);
          addPoints(pts);
          updateProgress("number-sequence", level);
          setGameState("won");
        } else {
          setRound((r) => r + 1);
          setPuzzle(generateSequence(level));
          setTimeLeft(getTimeLimit(level));
        }
      }, 600);
    } else {
      playClickBomb();
      setFeedbackCorrect(false);
      clearInterval(timerRef.current);
      setTimeout(() => {
        setFeedback(null);
        playGameOver();
        setGameState("lost");
      }, 600);
    }
  }, [gameState, feedback, puzzle, correct, roundsNeeded, level, addPoints, updateProgress]);

  const startGame = useCallback(() => {
    if (!spendEnergy(1)) return;
    setPuzzle(generateSequence(level));
    setRound(0);
    setCorrect(0);
    setTimeLeft(getTimeLimit(level));
    setGameState("playing");
    setEarnedPoints(0);
    setFeedback(null);
    setFeedbackCorrect(false);
  }, [level, spendEnergy]);

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = () => { setGameState("idle"); };

  return (
    <GameLayout title="Number Sequence" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-xs text-muted-foreground">Solved: <span className="text-primary font-bold">{correct}/{roundsNeeded}</span></span>
          <span className={`text-xs font-bold ${timeLeft <= 3 ? "text-destructive" : "text-accent"}`}>{timeLeft}s</span>
        </div>

        <p className="text-center text-muted-foreground text-xs mb-4">Find the next number in the sequence</p>

        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {puzzle.sequence.map((num, i) => (
            <motion.span
              key={`${round}-${i}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl font-display font-bold text-sm border border-border/50 bg-secondary text-foreground"
            >
              {num}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: puzzle.sequence.length * 0.1 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl font-display font-bold text-lg border-2 border-dashed border-primary/50 text-primary"
          >
            ?
          </motion.span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {puzzle.options.map((opt) => (
            <motion.button
              key={`${round}-${opt}`}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleAnswer(opt)}
              disabled={feedback !== null}
              className="py-3 rounded-xl font-display font-bold text-sm transition-all disabled:opacity-60 cursor-pointer"
              style={{
                background: feedback === opt
                  ? feedbackCorrect
                    ? "linear-gradient(145deg, hsl(160 80% 20%), hsl(160 60% 12%))"
                    : "linear-gradient(145deg, hsl(var(--destructive) / 0.3), hsl(var(--destructive) / 0.1))"
                  : "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
                border: `1.5px solid ${feedback === opt ? (feedbackCorrect ? "hsl(160 80% 40%)" : "hsl(var(--destructive))") : "hsl(var(--border) / 0.5)"}`,
                color: feedback === opt ? (feedbackCorrect ? "hsl(160 80% 60%)" : "hsl(var(--destructive))") : "hsl(var(--foreground))",
                boxShadow: feedback === opt && feedbackCorrect ? "0 0 16px hsl(160 80% 50% / 0.3)" : "0 2px 8px hsl(0 0% 0% / 0.3)",
              }}
            >
              {opt}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {gameState !== "playing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4">
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🧮</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Brilliant!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">{correct} sequences solved</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">❌</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Wrong Answer!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Solved {correct}/{roundsNeeded}</p>
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

export default NumberSequence;
