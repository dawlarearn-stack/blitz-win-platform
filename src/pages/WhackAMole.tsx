import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getHitsNeeded(level: number): number {
  return Math.min(5 + Math.floor(level * 0.12), 15);
}

function getMoleSpeed(level: number): number {
  if (level <= 10) return 1200;
  if (level <= 30) return 900;
  if (level <= 60) return 700;
  if (level <= 80) return 550;
  return 450;
}

function getGridSize(level: number): number {
  if (level <= 10) return 9;
  if (level <= 30) return 12;
  return 16;
}

function getActiveMoles(level: number): number {
  if (level <= 10) return 1;
  if (level <= 30) return 1;
  if (level <= 60) return 2;
  return 2;
}

function getBadMoleChance(level: number): number {
  if (level <= 10) return 0;
  if (level <= 30) return 0.15;
  if (level <= 60) return 0.2;
  return 0.3;
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

const MOLE_EMOJI = "🐹";
const BAD_MOLE_EMOJI = "💀";

const WhackAMole = () => {
  const { data, startLevel, completeLevel } = useGameStore();
  const progress = data.progress["whack-a-mole"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [activeCells, setActiveCells] = useState<Map<number, "good" | "bad">>(new Map());
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [tapped, setTapped] = useState<{ id: number; type: "hit" | "miss" | "bad" } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const hitsNeeded = getHitsNeeded(level);
  const maxMisses = 3;

  const startGame = useCallback(async () => {
    const ok = await startLevel("whack-a-mole", level);
    if (!ok) return;
    setGameState("playing");
    setHits(0);
    setMisses(0);
    hitsRef.current = 0;
    missesRef.current = 0;
    setActiveCells(new Map());
    setEarnedPoints(0);
    setTapped(null);
  }, [startLevel, level]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const gridSize = getGridSize(level);
    const speed = getMoleSpeed(level);
    const activeCount = getActiveMoles(level);
    const badChance = getBadMoleChance(level);

    const spawnMoles = () => {
      setActiveCells((prev) => {
        const next = new Map<number, "good" | "bad">();
        for (let i = 0; i < activeCount; i++) {
          let pos: number;
          do {
            pos = Math.floor(Math.random() * gridSize);
          } while (next.has(pos));
          const isBad = Math.random() < badChance;
          next.set(pos, isBad ? "bad" : "good");
        }
        return next;
      });
    };

    spawnMoles();
    intervalRef.current = setInterval(() => {
      // Check for misses on unwhacked good moles
      setActiveCells((prev) => {
        prev.forEach((type) => {
          if (type === "good") {
            missesRef.current += 1;
            if (missesRef.current >= maxMisses) {
              clearInterval(intervalRef.current);
              playGameOver();
              setGameState("lost");
              completeLevel("whack-a-mole", level, false);
              setMisses(missesRef.current);
            }
          }
        });
        setMisses(missesRef.current);
        return prev;
      });
      if (missesRef.current < maxMisses) {
        spawnMoles();
      }
    }, speed);

    return () => clearInterval(intervalRef.current);
  }, [gameState, level]);

  const handleTap = useCallback((cellIdx: number) => {
    if (gameState !== "playing") return;
    const type = activeCells.get(cellIdx);
    if (!type) return;

    if (type === "bad") {
      playClickBomb();
      setTapped({ id: cellIdx, type: "bad" });
      clearInterval(intervalRef.current);
      setTimeout(() => {
        setTapped(null);
        playGameOver();
        setGameState("lost");
        completeLevel("whack-a-mole", level, false);
      }, 500);
      return;
    }

    playClickSafe();
    setTapped({ id: cellIdx, type: "hit" });
    hitsRef.current += 1;
    setHits(hitsRef.current);
    setActiveCells((prev) => {
      const next = new Map(prev);
      next.delete(cellIdx);
      return next;
    });

    setTimeout(() => setTapped(null), 300);

    if (hitsRef.current >= hitsNeeded) {
      clearInterval(intervalRef.current);
      playLevelWin();
      const pts = getPointsForLevel(level);
      setEarnedPoints(pts);
      completeLevel("whack-a-mole", level, true);
      setGameState("won");
    }
  }, [gameState, activeCells, hitsNeeded, level, completeLevel]);

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = () => { setGameState("idle"); };

  const gridSize = getGridSize(level);
  const cols = gridSize <= 9 ? 3 : 4;

  return (
    <GameLayout title="Whack-a-Mole" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-sm">
        {gameState === "idle" ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🐹</div>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">Whack-a-Mole</h2>
            <p className="text-muted-foreground text-xs mb-6">Tap the moles! Avoid the skulls 💀</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">START</button>
          </div>
        ) : gameState === "playing" || gameState === "won" || gameState === "lost" ? (
          <>
            <div className="flex justify-between items-center mb-4 px-1">
              <span className="text-xs text-muted-foreground">Hits: <span className="text-primary font-bold">{hits}/{hitsNeeded}</span></span>
              <span className="text-xs text-muted-foreground">Misses: <span className={`font-bold ${misses >= maxMisses - 1 ? "text-destructive" : "text-accent"}`}>{misses}/{maxMisses}</span></span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mb-4">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(hits / hitsNeeded) * 100}%`, background: "hsl(var(--primary))" }} />
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: gridSize }, (_, i) => {
                const moleType = activeCells.get(i);
                const isTapped = tapped?.id === i;
                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleTap(i)}
                    className="aspect-square rounded-xl cursor-pointer flex items-center justify-center text-2xl relative overflow-hidden"
                    style={{
                      background: isTapped
                        ? tapped?.type === "hit"
                          ? "linear-gradient(145deg, hsl(160 80% 20%), hsl(160 60% 12%))"
                          : "linear-gradient(145deg, hsl(var(--destructive) / 0.3), hsl(var(--destructive) / 0.1))"
                        : "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
                      border: `1.5px solid ${isTapped ? (tapped?.type === "hit" ? "hsl(160 80% 40%)" : "hsl(var(--destructive))") : "hsl(var(--border) / 0.4)"}`,
                      boxShadow: moleType ? "0 0 12px hsl(var(--primary) / 0.2)" : "0 2px 6px hsl(0 0% 0% / 0.3)",
                    }}
                  >
                    <AnimatePresence>
                      {moleType && (
                        <motion.span
                          initial={{ y: 30, opacity: 0, scale: 0.2, rotate: -20 }}
                          animate={{ 
                            y: [0, -4, 0], 
                            opacity: 1, 
                            scale: 1, 
                            rotate: [0, 3, -3, 0],
                          }}
                          exit={{ y: 25, opacity: 0, scale: 0.3, rotate: 15 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 500, 
                            damping: 12,
                            y: { repeat: Infinity, duration: 0.8, ease: "easeInOut" },
                            rotate: { repeat: Infinity, duration: 1.2, ease: "easeInOut" },
                          }}
                          className="absolute text-4xl md:text-5xl drop-shadow-lg"
                          style={{ filter: moleType === "bad" ? "drop-shadow(0 0 8px hsl(var(--destructive)))" : "drop-shadow(0 0 8px hsl(var(--primary) / 0.6))" }}
                        >
                          {moleType === "good" ? MOLE_EMOJI : BAD_MOLE_EMOJI}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </>
        ) : null}

        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4">
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🔨</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Great Whacking!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">{hits} moles whacked</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">😵</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Too Slow!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Hit {hits}/{hitsNeeded} moles</p>
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

export default WhackAMole;
