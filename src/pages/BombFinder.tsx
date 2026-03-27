import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bomb, RotateCcw, ArrowRight, Sparkles, Star } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";

const COLS = 6;
const ROWS = 5;
const TOTAL_CELLS = COLS * ROWS;

// Level config: returns { bombs, safeCells } for a given level (1-100)
function getLevelConfig(level: number): { bombs: number; safeCells: number } {
  // Bomb count scales from 3 at level 1 to 25 at level 100
  const bombs = Math.min(25, Math.max(3, Math.round(3 + (level - 1) * (22 / 99))));
  // Safe cells scale: start generous, get tighter
  let safeCells: number;
  if (level <= 10) safeCells = Math.max(5, Math.round(8 - (level - 1) * 0.3));
  else if (level <= 30) safeCells = Math.max(5, Math.round(8 - (level - 10) * 0.1));
  else if (level <= 60) safeCells = Math.max(5, Math.round(6 - (level - 30) * 0.03));
  else safeCells = 5;
  // Ensure bombs + safeCells <= TOTAL_CELLS
  if (bombs + safeCells > TOTAL_CELLS) safeCells = TOTAL_CELLS - bombs;
  return { bombs, safeCells };
}

// Points per level tier
function getPointsForLevel(level: number): number {
  if (level <= 10) return 10;
  if (level <= 20) return 15;
  if (level <= 40) return 20;
  if (level <= 60) return 25;
  if (level <= 80) return 30;
  if (level <= 90) return 35;
  return 50;
}

type CellType = "bomb" | "safe" | "empty";
type Cell = { id: number; type: CellType; revealed: boolean };
type GameState = "playing" | "won" | "lost";

function generateGrid(level: number): Cell[] {
  const { bombs, safeCells } = getLevelConfig(level);
  const indices = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
  // Shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const bombSet = new Set(indices.slice(0, bombs));
  const safeSet = new Set(indices.slice(bombs, bombs + safeCells));

  return Array.from({ length: TOTAL_CELLS }, (_, i) => ({
    id: i,
    type: bombSet.has(i) ? "bomb" : safeSet.has(i) ? "safe" : "empty",
    revealed: false,
  }));
}

const BombFinder = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["bomb-finder"];
  const [level, setLevel] = useState(progress?.currentLevel ? progress.currentLevel + 1 : 1);
  const [grid, setGrid] = useState<Cell[]>(() => generateGrid(level));
  const [gameState, setGameState] = useState<GameState>("playing");
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  const config = useMemo(() => getLevelConfig(level), [level]);
  const totalSafe = useMemo(() => grid.filter((c) => c.type === "safe").length, [grid]);
  const revealedSafe = useMemo(() => grid.filter((c) => c.revealed && c.type === "safe").length, [grid]);

  const spawnParticles = useCallback((cellId: number) => {
    const col = cellId % COLS;
    const row = Math.floor(cellId / COLS);
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: (col / COLS) * 100 + 8,
      y: (row / ROWS) * 100 + 10,
    }));
    setParticles((p) => [...p, ...newParticles]);
    setTimeout(() => setParticles((p) => p.filter((pp) => !newParticles.find((np) => np.id === pp.id))), 800);
  }, []);

  const handleClick = (cell: Cell) => {
    if (gameState !== "playing" || cell.revealed) return;

    if (cell.type === "empty") return; // empty cells do nothing

    const next = grid.map((c) => (c.id === cell.id ? { ...c, revealed: true } : c));
    setGrid(next);

    if (cell.type === "bomb") {
      // Reveal all bombs
      setGrid(next.map((c) => (c.type === "bomb" ? { ...c, revealed: true } : c)));
      setGameState("lost");
    } else if (cell.type === "safe") {
      spawnParticles(cell.id);
      const newRevealed = next.filter((c) => c.revealed && c.type === "safe").length;
      if (newRevealed === totalSafe) {
        const pts = getPointsForLevel(level);
        setEarnedPoints(pts);
        addPoints(pts);
        updateProgress("bomb-finder", level);
        setGameState("won");
      }
    }
  };

  const retry = () => {
    setGrid(generateGrid(level));
    setGameState("playing");
    setEarnedPoints(0);
  };

  const nextLevel = () => {
    const next = Math.min(level + 1, 100);
    setLevel(next);
    setGrid(generateGrid(next));
    setGameState("playing");
    setEarnedPoints(0);
  };

  const getCellClasses = (cell: Cell) => {
    if (!cell.revealed) {
      if (cell.type === "empty") return "bg-muted/30 cursor-default opacity-40";
      return "bg-secondary hover:bg-secondary/80 hover:shadow-[0_0_12px_hsl(185_100%_50%/0.3)] cursor-pointer";
    }
    if (cell.type === "bomb") return "bg-destructive/20 border-destructive/60 shadow-[0_0_20px_hsl(0_85%_55%/0.5)]";
    if (cell.type === "safe") return "bg-primary/20 border-primary/60 shadow-[0_0_20px_hsl(185_100%_50%/0.4)]";
    return "bg-muted/30";
  };

  return (
    <GameLayout title="Bomb Finder" level={level} points={data.points}>
      <div className="w-full max-w-sm relative">
        {/* Level Badge */}
        <motion.div
          key={level}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-4"
        >
          <span className="font-display text-xs tracking-[0.3em] uppercase text-muted-foreground">Level</span>
          <h2 className="font-display text-3xl font-black neon-text text-primary animate-pulse-neon inline-block ml-2">
            {level}
          </h2>
        </motion.div>

        {/* Progress */}
        <div className="flex justify-between text-xs text-muted-foreground mb-3 font-display">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" /> Safe: {revealedSafe}/{totalSafe}
          </span>
          <span className="flex items-center gap-1">
            <Bomb className="w-3 h-3 text-destructive" /> Bombs: {config.bombs}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-accent" /> +{getPointsForLevel(level)} pts
          </span>
        </div>

        {/* Grid */}
        <div className="relative">
          <div className="grid grid-cols-6 gap-1.5 mb-6">
            {grid.map((cell) => (
              <motion.button
                key={cell.id}
                whileTap={cell.type !== "empty" && !cell.revealed ? { scale: 0.85 } : undefined}
                onClick={() => handleClick(cell)}
                disabled={cell.revealed || gameState !== "playing" || cell.type === "empty"}
                className={`game-grid-cell text-lg transition-all duration-300 ${getCellClasses(cell)}`}
              >
                <AnimatePresence mode="wait">
                  {cell.revealed && cell.type === "bomb" && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="flex items-center justify-center"
                    >
                      <Bomb className="w-4 h-4 text-destructive drop-shadow-[0_0_8px_hsl(0_85%_55%/0.8)]" />
                    </motion.div>
                  )}
                  {cell.revealed && cell.type === "safe" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4 text-primary drop-shadow-[0_0_8px_hsl(185_100%_50%/0.8)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {/* Particle effects */}
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 1, x: `${p.x}%`, y: `${p.y}%` }}
                animate={{
                  opacity: 0,
                  scale: 0,
                  x: `${p.x + (Math.random() - 0.5) * 30}%`,
                  y: `${p.y - 20 - Math.random() * 20}%`,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(185_100%_50%/0.8)] pointer-events-none"
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameState !== "playing" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 20 }}
              className="gradient-card rounded-2xl neon-border p-6 text-center"
            >
              {gameState === "won" ? (
                <>
                  <motion.h2
                    initial={{ y: -10 }}
                    animate={{ y: 0 }}
                    className="font-display text-xl font-bold text-primary neon-text mb-2"
                  >
                    Level Clear!
                  </motion.h2>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="font-display text-3xl font-black text-accent neon-text-accent mb-4"
                  >
                    +{earnedPoints} pts
                  </motion.p>
                  <button
                    onClick={nextLevel}
                    className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform"
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
                  <motion.h2
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    className="font-display text-xl font-bold text-destructive mb-2"
                  >
                    💥 Boom!
                  </motion.h2>
                  <p className="text-muted-foreground text-sm mb-4">You hit a bomb. Try again!</p>
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-colors neon-border"
                  >
                    <RotateCcw className="w-4 h-4" /> RETRY
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameLayout>
  );
};

export default BombFinder;
