import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bomb, RotateCcw, ArrowRight, Sparkles } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";

const COLS = 6;
const ROWS = 5;
const TOTAL_CELLS = COLS * ROWS;

function getBombCount(level: number) {
  return Math.min(3 + Math.floor(level * 0.25), TOTAL_CELLS - 5);
}

function generateGrid(level: number) {
  const bombCount = getBombCount(level);
  const bombs = new Set<number>();
  while (bombs.size < bombCount) {
    bombs.add(Math.floor(Math.random() * TOTAL_CELLS));
  }
  return Array.from({ length: TOTAL_CELLS }, (_, i) => ({
    id: i,
    isBomb: bombs.has(i),
    revealed: false,
  }));
}

type Cell = { id: number; isBomb: boolean; revealed: boolean };
type GameState = "playing" | "won" | "lost";

const BombFinder = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["bomb-finder"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [grid, setGrid] = useState<Cell[]>(() => generateGrid(level));
  const [gameState, setGameState] = useState<GameState>("playing");
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);

  const safeCells = useMemo(() => grid.filter((c) => !c.isBomb).length, [grid]);
  const revealedSafe = useMemo(() => grid.filter((c) => c.revealed && !c.isBomb).length, [grid]);

  const pointsPerLevel = useCallback((lvl: number) => 50 + lvl * 10, []);

  const handleClick = (cell: Cell) => {
    if (gameState !== "playing" || cell.revealed) return;

    const next = grid.map((c) => (c.id === cell.id ? { ...c, revealed: true } : c));
    setGrid(next);

    if (cell.isBomb) {
      // Reveal all bombs
      setGrid(next.map((c) => (c.isBomb ? { ...c, revealed: true } : c)));
      setGameState("lost");
    } else {
      const newRevealed = next.filter((c) => c.revealed && !c.isBomb).length;
      if (newRevealed === safeCells) {
        const pts = pointsPerLevel(level);
        setEarnedPoints(pts);
        setSessionPoints((p) => p + pts);
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

  return (
    <GameLayout title="Bomb Finder" level={level} points={data.points}>
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>Safe: {revealedSafe}/{safeCells}</span>
          <span>Bombs: {getBombCount(level)}</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-6 gap-1.5 mb-6">
          {grid.map((cell) => (
            <motion.button
              key={cell.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleClick(cell)}
              disabled={cell.revealed || gameState !== "playing"}
              className={`game-grid-cell text-lg ${
                !cell.revealed
                  ? "bg-secondary hover:bg-secondary/80"
                  : cell.isBomb
                  ? "bg-destructive/20 border-destructive/50"
                  : "bg-primary/20 border-primary/50"
              }`}
            >
              {cell.revealed && (cell.isBomb ? <Bomb className="w-4 h-4 text-destructive" /> : <Sparkles className="w-4 h-4 text-primary" />)}
            </motion.button>
          ))}
        </div>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameState !== "playing" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="gradient-card rounded-2xl border border-border/50 p-6 text-center"
            >
              {gameState === "won" ? (
                <>
                  <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Level Clear!</h2>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="font-display text-3xl font-black text-accent mb-4"
                  >
                    +{earnedPoints} pts
                  </motion.p>
                  <button
                    onClick={nextLevel}
                    className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform"
                  >
                    {level < 100 ? <>NEXT LEVEL <ArrowRight className="w-4 h-4" /></> : "MAX LEVEL!"}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="font-display text-xl font-bold text-destructive mb-2">💥 Boom!</h2>
                  <p className="text-muted-foreground text-sm mb-4">You hit a bomb. Try again!</p>
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-colors"
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
