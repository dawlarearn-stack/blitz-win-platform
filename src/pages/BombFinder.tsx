import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bomb, RotateCcw, ArrowRight, Sparkles, Star, Zap } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

const COLS = 6;
const ROWS = 5;
const TOTAL_CELLS = COLS * ROWS;

function getLevelConfig(level: number): { bombs: number; safeTarget: number } {
  // Bombs: 3 → 25 over 100 levels
  const bombs = Math.min(Math.round(3 + ((level - 1) / 99) * 22), TOTAL_CELLS - 2);
  const safeCells = TOTAL_CELLS - bombs;

  // SafeTarget scales up then back down as safe cells shrink
  // Peak around level 40-50 where both bombs and required clicks are high
  let safeTarget: number;
  if (level <= 10) {
    safeTarget = Math.round(5 + ((level - 1) / 9) * 3); // 5 → 8
  } else if (level <= 30) {
    safeTarget = Math.round(8 + ((level - 10) / 20) * 6); // 8 → 14
  } else if (level <= 50) {
    safeTarget = Math.round(14 + ((level - 30) / 20) * 2); // 14 → 16
  } else if (level <= 70) {
    safeTarget = Math.round(16 - ((level - 50) / 20) * 4); // 16 → 12
  } else if (level <= 90) {
    safeTarget = Math.round(12 - ((level - 70) / 20) * 4); // 12 → 8
  } else {
    safeTarget = Math.round(8 - ((level - 90) / 10) * 3); // 8 → 5
  }

  // Never require more safe clicks than available safe cells
  safeTarget = Math.min(safeTarget, safeCells);
  return { bombs, safeTarget };
}

function getPointsForLevel(level: number): number {
  if (level <= 10) return 10;
  if (level <= 20) return 15;
  if (level <= 40) return 20;
  if (level <= 60) return 25;
  if (level <= 80) return 30;
  if (level <= 90) return 45;
  return 65;
}

type Cell = { id: number; isBomb: boolean; revealed: boolean };
type GameState = "idle" | "playing" | "won" | "lost";

function generateGrid(bombs: number): Cell[] {
  const indices = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const bombSet = new Set(indices.slice(0, bombs));
  return Array.from({ length: TOTAL_CELLS }, (_, i) => ({
    id: i,
    isBomb: bombSet.has(i),
    revealed: false,
  }));
}

const BombFinder = () => {
  const { data, addPoints, spendEnergy, updateProgress } = useGameStore();
  const progress = data.progress["bomb-finder"];
  const [level, setLevel] = useState(progress?.currentLevel ? progress.currentLevel + 1 : 1);

  const config = useMemo(() => getLevelConfig(level), [level]);
  const [grid, setGrid] = useState<Cell[]>(() => generateGrid(config.bombs));
  const [gameState, setGameState] = useState<GameState>("playing");
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [safeClicked, setSafeClicked] = useState(0);

  const getCellPosition = (cellId: number) => {
    const col = cellId % COLS;
    const row = Math.floor(cellId / COLS);
    return { x: (col / COLS) * 100 + 8, y: (row / ROWS) * 100 + 10 };
  };

  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [explosions, setExplosions] = useState<{ id: number; x: number; y: number }[]>([]);
  const [pointPopups, setPointPopups] = useState<{ id: number; x: number; y: number }[]>([]);

  const spawnParticles = useCallback((cellId: number) => {
    const pos = getCellPosition(cellId);
    const newP = Array.from({ length: 8 }, (_, i) => ({ id: Date.now() + i, x: pos.x, y: pos.y }));
    setParticles((p) => [...p, ...newP]);
    setTimeout(() => setParticles((p) => p.filter((pp) => !newP.find((np) => np.id === pp.id))), 900);
  }, []);

  const spawnExplosion = useCallback((cellId: number) => {
    const pos = getCellPosition(cellId);
    const newE = Array.from({ length: 12 }, (_, i) => ({ id: Date.now() + i + 100, x: pos.x, y: pos.y }));
    setExplosions((e) => [...e, ...newE]);
    setTimeout(() => setExplosions((e) => e.filter((ee) => !newE.find((ne) => ne.id === ee.id))), 1000);
  }, []);

  const spawnPointPopup = useCallback((cellId: number) => {
    const pos = getCellPosition(cellId);
    const popup = { id: Date.now() + 200, x: pos.x, y: pos.y };
    setPointPopups((p) => [...p, popup]);
    setTimeout(() => setPointPopups((p) => p.filter((pp) => pp.id !== popup.id)), 1000);
  }, []);

  const handleClick = (cell: Cell) => {
    if (gameState !== "playing" || cell.revealed) return;

    const next = grid.map((c) => (c.id === cell.id ? { ...c, revealed: true } : c));
    setGrid(next);

    if (cell.isBomb) {
      playClickBomb();
      spawnExplosion(cell.id);
      setTimeout(() => {
        setGrid(next.map((c) => (c.isBomb ? { ...c, revealed: true } : c)));
        playGameOver();
      }, 300);
      setGameState("lost");
    } else {
      playClickSafe();
      spawnParticles(cell.id);
      spawnPointPopup(cell.id);
      const newSafe = safeClicked + 1;
      setSafeClicked(newSafe);
      if (newSafe >= config.safeTarget) {
        const pts = getPointsForLevel(level);
        setEarnedPoints(pts);
        addPoints(pts);
        updateProgress("bomb-finder", level);
        setGameState("won");
        playLevelWin();
      }
    }
  };

  const resetGame = (newLevel: number) => {
    if (!spendEnergy(1)) return;
    const cfg = getLevelConfig(newLevel);
    setLevel(newLevel);
    setGrid(generateGrid(cfg.bombs));
    setGameState("playing");
    setEarnedPoints(0);
    setSafeClicked(0);
    setParticles([]);
    setExplosions([]);
    setPointPopups([]);
  };

  return (
    <GameLayout title="Bomb Finder" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-sm relative">
        {/* Level Badge */}
        <motion.div
          key={level}
          initial={{ scale: 0.5, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="text-center mb-3"
        >
          <span className="font-display text-[10px] tracking-[0.4em] uppercase text-muted-foreground">Level</span>
          <h2 className="font-display text-4xl font-black neon-text text-primary ml-2 inline-block animate-glow-pulse">
            {level}
          </h2>
        </motion.div>

        {/* Stats Bar */}
        <div className="flex justify-between text-[10px] text-muted-foreground mb-3 font-display px-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-primary">{safeClicked}</span>/{config.safeTarget} Safe
          </span>
          <span className="flex items-center gap-1">
            <Bomb className="w-3 h-3 text-destructive" />
            {config.bombs} Bombs
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent" />
            +{getPointsForLevel(level)} pts
          </span>
        </div>

        {/* Grid */}
        <div className="relative">
          <div className="grid grid-cols-6 gap-2 mb-5">
            {grid.map((cell) => {
              const isUnrevealed = !cell.revealed;
              const isBombRevealed = cell.revealed && cell.isBomb;
              const isSafeRevealed = cell.revealed && !cell.isBomb;

              return (
                <motion.button
                  key={cell.id}
                  whileHover={isUnrevealed && gameState === "playing" ? { scale: 1.1, y: -3 } : undefined}
                  whileTap={isUnrevealed && gameState === "playing" ? { scale: 0.9 } : undefined}
                  onClick={() => handleClick(cell)}
                  disabled={cell.revealed || gameState !== "playing"}
                  className="relative aspect-square rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isUnrevealed
                      ? "linear-gradient(145deg, hsl(230 20% 16%), hsl(230 22% 10%))"
                      : isBombRevealed
                      ? "linear-gradient(145deg, hsl(0 60% 18%), hsl(0 50% 10%))"
                      : "linear-gradient(145deg, hsl(185 40% 16%), hsl(185 30% 10%))",
                    boxShadow: isUnrevealed
                      ? "4px 4px 10px hsl(230 25% 3%), -2px -2px 8px hsl(230 15% 18%), inset 0 1px 1px hsl(230 15% 22%)"
                      : isBombRevealed
                      ? "0 0 20px hsl(0 85% 55% / 0.5), inset 0 0 10px hsl(0 85% 55% / 0.15)"
                      : "0 0 20px hsl(185 100% 50% / 0.35), inset 0 0 10px hsl(185 100% 50% / 0.1)",
                    border: isUnrevealed
                      ? "1px solid hsl(230 15% 20%)"
                      : isBombRevealed
                      ? "1px solid hsl(0 85% 55% / 0.5)"
                      : "1px solid hsl(185 100% 50% / 0.4)",
                  }}
                >
                  {isUnrevealed && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{ background: "linear-gradient(135deg, hsl(230 15% 25% / 0.5) 0%, transparent 50%)" }}
                    />
                  )}

                  <AnimatePresence mode="wait">
                    {isBombRevealed && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <Bomb className="w-7 h-7 text-destructive drop-shadow-[0_0_14px_hsl(0_85%_55%/0.9)]" />
                      </motion.div>
                    )}
                    {isSafeRevealed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.5, 1] }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <Sparkles className="w-7 h-7 text-primary drop-shadow-[0_0_14px_hsl(185_100%_50%/0.9)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          {/* Particles */}
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 1, x: `${p.x}%`, y: `${p.y}%` }}
                animate={{
                  opacity: 0, scale: 0.3,
                  x: `${p.x + (Math.random() - 0.5) * 40}%`,
                  y: `${p.y - 15 - Math.random() * 25}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary pointer-events-none"
                style={{ boxShadow: "0 0 8px hsl(185 100% 50% / 0.9)" }}
              />
            ))}
          </AnimatePresence>

          {/* Explosions */}
          <AnimatePresence>
            {explosions.map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 1, scale: 1, x: `${e.x}%`, y: `${e.y}%` }}
                animate={{
                  opacity: 0, scale: 0,
                  x: `${e.x + (Math.random() - 0.5) * 60}%`,
                  y: `${e.y + (Math.random() - 0.5) * 60}%`,
                }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute w-2 h-2 rounded-full pointer-events-none"
                style={{
                  background: Math.random() > 0.5 ? "hsl(0 85% 55%)" : "hsl(30 100% 55%)",
                  boxShadow: "0 0 10px hsl(0 85% 55% / 0.8)",
                }}
              />
            ))}
          </AnimatePresence>

          {/* Point popups */}
          <AnimatePresence>
            {pointPopups.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 1, y: 0, x: `${p.x}%`, scale: 0.5 }}
                animate={{ opacity: 0, y: -40, scale: 1 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute font-display text-xs font-black text-accent pointer-events-none"
                style={{ top: `${p.y}%`, textShadow: "0 0 8px hsl(320 100% 60% / 0.8)" }}
              >
                +{getPointsForLevel(level)}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {/* Overlay Popup for Win / Lose */}
        <AnimatePresence>
          {gameState !== "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 250 }}
                className="gradient-card rounded-2xl neon-border p-8 text-center mx-4 max-w-xs w-full relative"
              >
                {gameState === "won" ? (
                  <>
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Star className="w-12 h-12 text-accent mx-auto mb-3 drop-shadow-[0_0_16px_hsl(320_100%_60%/0.6)]" />
                    </motion.div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-1">
                      Level {level} Clear!
                    </h2>
                    <p className="text-muted-foreground text-xs mb-2">
                      {safeClicked}/{config.safeTarget} safe cells found
                    </p>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                      className="font-display text-4xl font-black text-accent neon-text-accent mb-6"
                    >
                      +{earnedPoints} pts
                    </motion.p>
                    <button
                      onClick={() => resetGame(Math.min(level + 1, 100))}
                      className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform w-full justify-center"
                    >
                      {level < 100 ? (
                        <>NEXT LEVEL <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        "🏆 MAX LEVEL!"
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                      className="text-5xl mb-3"
                    >
                      💥
                    </motion.div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-1">Boom!</h2>
                    <p className="text-muted-foreground text-xs mb-2">
                      {safeClicked}/{config.safeTarget} safe — so close!
                    </p>
                    <p className="text-muted-foreground text-[10px] mb-6">You hit a bomb. Try again!</p>
                    <button
                      onClick={() => resetGame(level)}
                      className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-8 py-3 rounded-xl hover:bg-secondary/80 transition-colors neon-border w-full justify-center"
                    >
                      <RotateCcw className="w-4 h-4" /> RETRY
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

export default BombFinder;
