import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Crosshair } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getTargetCount(level: number): number {
  if (level <= 5) return 5 + level;
  if (level <= 20) return 10 + Math.floor((level - 5) * 0.5);
  if (level <= 50) return 18 + Math.floor((level - 20) * 0.4);
  return Math.min(30 + Math.floor((level - 50) * 0.2), 40);
}

function getTimeLimit(level: number): number {
  if (level <= 10) return 30;
  if (level <= 30) return 25;
  if (level <= 60) return 20;
  return 15;
}

function getTargetLifespan(level: number): number {
  if (level <= 10) return 2000;
  if (level <= 30) return 1500;
  if (level <= 60) return 1200;
  return 900;
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

interface Target {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

const ReactionTap = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["reaction-tap"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [targets, setTargets] = useState<Target[]>([]);
  const [tapped, setTapped] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [tapEffects, setTapEffects] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const targetCountNeeded = getTargetCount(level);
  const timeLimit = getTimeLimit(level);
  const maxMissed = 5;

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startGame = useCallback(() => {
    cleanup();
    setGameState("playing");
    setTargets([]);
    setTapped(0);
    setMissed(0);
    setTimeLeft(timeLimit);
    setEarnedPoints(0);
    nextIdRef.current = 0;

    const lifespan = getTargetLifespan(level);
    const spawnRate = Math.max(400, 1200 - level * 8);

    intervalRef.current = setInterval(() => {
      const id = nextIdRef.current++;
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 80;
      setTargets((prev) => [...prev, { id, x, y, createdAt: Date.now() }]);

      setTimeout(() => {
        setTargets((prev) => {
          const still = prev.find((t) => t.id === id);
          if (still) {
            setMissed((m) => m + 1);
            return prev.filter((t) => t.id !== id);
          }
          return prev;
        });
      }, lifespan);
    }, spawnRate);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) return 0;
        return t - 1;
      });
    }, 1000);
  }, [level, timeLimit, cleanup]);

  // Check win/lose
  useEffect(() => {
    if (gameState !== "playing") return;
    if (tapped >= targetCountNeeded) {
      cleanup();
      playLevelWin();
      const pts = getPointsForLevel(level);
      setEarnedPoints(pts);
      addPoints(pts);
      updateProgress("reaction-tap", level);
      setGameState("won");
    } else if (timeLeft === 0 || missed >= maxMissed) {
      cleanup();
      playGameOver();
      setGameState("lost");
    }
  }, [tapped, timeLeft, missed, gameState, targetCountNeeded, level, cleanup, addPoints, updateProgress]);

  const handleTap = (target: Target) => {
    playClickSafe();
    setTargets((prev) => prev.filter((t) => t.id !== target.id));
    setTapped((t) => t + 1);
    setTapEffects((prev) => [...prev, { id: target.id, x: target.x, y: target.y }]);
    setTimeout(() => setTapEffects((prev) => prev.filter((e) => e.id !== target.id)), 600);
  };

  const nextLevel = () => {
    setLevel((l) => Math.min(l + 1, 100));
    setGameState("idle");
  };

  const retry = () => setGameState("idle");

  return (
    <GameLayout title="Reaction Tap" level={level} points={data.points}>
      <div className="w-full max-w-lg">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <Crosshair className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Tap the Targets!</h2>
            <p className="text-muted-foreground text-sm mb-2">Tap {targetCountNeeded} targets in {timeLimit}s</p>
            <p className="text-muted-foreground text-xs mb-6">Miss {maxMissed} and you lose!</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">
              START
            </button>
          </motion.div>
        )}

        {gameState === "playing" && (
          <>
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-xs text-muted-foreground">Tapped: <span className="text-primary font-bold">{tapped}/{targetCountNeeded}</span></span>
              <span className="text-xs text-muted-foreground">Time: <span className={`font-bold ${timeLeft <= 5 ? "text-destructive" : "text-accent"}`}>{timeLeft}s</span></span>
              <span className="text-xs text-muted-foreground">Missed: <span className={`font-bold ${missed >= 3 ? "text-destructive" : "text-accent"}`}>{missed}/{maxMissed}</span></span>
            </div>
            <div className="relative w-full rounded-2xl border border-border/50 overflow-hidden" style={{ aspectRatio: "1/1", background: "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))" }}>
              <AnimatePresence>
                {targets.map((t) => (
                  <motion.button
                    key={t.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={() => handleTap(t)}
                    className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full cursor-pointer"
                    style={{
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      background: "radial-gradient(circle, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
                      boxShadow: "0 0 20px hsl(var(--primary) / 0.5)",
                    }}
                  >
                    <Crosshair className="w-6 h-6 text-primary-foreground mx-auto" />
                  </motion.button>
                ))}
              </AnimatePresence>
              {tapEffects.map((e) => (
                <motion.div
                  key={`effect-${e.id}`}
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full pointer-events-none"
                  style={{ left: `${e.x}%`, top: `${e.y}%`, border: "2px solid hsl(var(--primary))" }}
                />
              ))}
            </div>
          </>
        )}

        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4" style={{ boxShadow: gameState === "won" ? "0 0 40px hsl(var(--primary) / 0.3)" : "0 0 40px hsl(var(--destructive) / 0.3)" }}>
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🎯</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Level Clear!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">Tapped {tapped} targets</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">
                      NEXT LEVEL <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">💥</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Time's Up!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Tapped {tapped}/{targetCountNeeded}</p>
                    <button onClick={retry} className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-colors">
                      RETRY
                    </button>
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

export default ReactionTap;
