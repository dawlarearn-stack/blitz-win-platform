import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw, Calculator } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getProblemsNeeded(level: number): number {
  return Math.min(5 + Math.floor(level * 0.1), 15);
}

function getTimeLimit(level: number): number {
  if (level <= 10) return 60;
  if (level <= 30) return 45;
  if (level <= 60) return 35;
  return 25;
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

function generateProblem(level: number) {
  const ops = level <= 20 ? ["+", "-"] : level <= 50 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const maxNum = Math.min(10 + Math.floor(level * 0.5), 50);
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      answer = a * b;
      break;
    default: // ÷
      b = Math.floor(Math.random() * 10) + 2;
      answer = Math.floor(Math.random() * 10) + 1;
      a = b * answer;
      break;
  }

  // Generate wrong options
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrong = answer + (offset === 0 ? 1 : offset);
    if (wrong >= 0) options.add(wrong);
  }
  return { question: `${a} ${op} ${b}`, answer, options: [...options].sort(() => Math.random() - 0.5) };
}

const QuickMath = () => {
  const { data, startLevel, completeLevel } = useGameStore();
  const progress = data.progress["quick-math"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [problem, setProblem] = useState(() => generateProblem(level));
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const problemsNeeded = getProblemsNeeded(level);

  const startGame = useCallback(async () => {
    const ok = await startLevel("quick-math", level);
    if (!ok) return;
    setGameState("playing");
    setSolved(0);
    setTimeLeft(getTimeLimit(level));
    setEarnedPoints(0);
    setProblem(generateProblem(level));
  }, [level, startLevel]);

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); playGameOver(); setGameState("lost"); completeLevel("quick-math", level, false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  const handleAnswer = (value: number) => {
    if (gameState !== "playing" || feedback) return;
    if (value === problem.answer) {
      playClickSafe();
      setFeedback("correct");
      const newSolved = solved + 1;
      setSolved(newSolved);
      setTimeout(() => {
        setFeedback(null);
        if (newSolved >= problemsNeeded) {
          clearInterval(timerRef.current);
          playLevelWin();
          const pts = getPointsForLevel(level);
          setEarnedPoints(pts);
          completeLevel("quick-math", level, true);
          setGameState("won");
        } else {
          setProblem(generateProblem(level));
        }
      }, 300);
    } else {
      playClickBomb();
      setFeedback("wrong");
      setTimeout(() => { setFeedback(null); clearInterval(timerRef.current); playGameOver(); setGameState("lost"); completeLevel("quick-math", level, false); }, 500);
    }
  };

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = async () => { await showRewardAd(); setGameState("idle"); };

  return (
    <GameLayout title="Quick Math" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-sm">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <Calculator className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Quick Math</h2>
            <p className="text-muted-foreground text-sm mb-6">Solve {problemsNeeded} problems in {getTimeLimit(level)}s</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">START</button>
          </motion.div>
        )}

        {gameState === "playing" && (
          <>
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs text-muted-foreground">Solved: <span className="text-primary font-bold">{solved}/{problemsNeeded}</span></span>
              <span className={`text-xs font-bold ${timeLeft <= 5 ? "text-destructive" : "text-accent"}`}>{timeLeft}s</span>
            </div>

            <motion.div
              key={problem.question}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-10 mb-6 rounded-2xl border border-border/50"
              style={{ background: feedback === "correct" ? "hsl(160 80% 20% / 0.2)" : feedback === "wrong" ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--secondary))" }}
            >
              <span className="font-display text-4xl font-black text-foreground">{problem.question} = ?</span>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {problem.options.map((opt, i) => (
                <motion.button
                  key={`${problem.question}-${opt}-${i}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnswer(opt)}
                  className="py-4 rounded-xl font-display font-bold text-lg border border-border/50 hover:border-primary/40 transition-all text-foreground"
                  style={{ background: "hsl(var(--secondary))" }}
                >
                  {opt}
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
                    <div className="text-5xl mb-3">🧮</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Math Genius!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">Solved {solved} problems</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">❌</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">{timeLeft === 0 ? "Time's Up!" : "Wrong Answer!"}</h2>
                    <p className="text-muted-foreground text-xs mb-5">Solved {solved}/{problemsNeeded}</p>
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

export default QuickMath;
