import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getSequenceLength(level: number): number {
  return Math.min(3 + Math.floor(level * 0.12), 15);
}

function getGridSize(level: number): number {
  if (level <= 20) return 3;
  if (level <= 50) return 4;
  return 5;
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

const PatternMemory = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["pattern-memory"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "showing" | "input" | "won" | "lost">("idle");
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const gridSize = getGridSize(level);
  const seqLength = getSequenceLength(level);
  const totalCells = gridSize * gridSize;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const startGame = useCallback(() => {
    const seq: number[] = [];
    for (let i = 0; i < seqLength; i++) {
      seq.push(Math.floor(Math.random() * totalCells));
    }
    setSequence(seq);
    setPlayerInput([]);
    setGameState("showing");
    setEarnedPoints(0);

    // Show sequence
    let i = 0;
    const showNext = () => {
      if (i < seq.length) {
        setActiveCell(seq[i]);
        timeoutRef.current = setTimeout(() => {
          setActiveCell(null);
          i++;
          timeoutRef.current = setTimeout(showNext, 300);
        }, 600);
      } else {
        setGameState("input");
      }
    };
    setTimeout(showNext, 500);
  }, [seqLength, totalCells]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleCellClick = (index: number) => {
    if (gameState !== "input") return;
    const step = playerInput.length;
    if (index === sequence[step]) {
      playClickSafe();
      setActiveCell(index);
      setTimeout(() => setActiveCell(null), 200);
      const newInput = [...playerInput, index];
      setPlayerInput(newInput);
      if (newInput.length === sequence.length) {
        playLevelWin();
        const pts = getPointsForLevel(level);
        setEarnedPoints(pts);
        addPoints(pts);
        updateProgress("pattern-memory", level);
        setGameState("won");
      }
    } else {
      playClickBomb();
      setActiveCell(index);
      setTimeout(() => {
        setActiveCell(null);
        playGameOver();
        setGameState("lost");
      }, 400);
    }
  };

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = () => setGameState("idle");

  return (
    <GameLayout title="Pattern Memory" level={level} points={data.points}>
      <div className="w-full max-w-sm">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Pattern Memory</h2>
            <p className="text-muted-foreground text-sm mb-6">Remember the sequence of {seqLength} cells</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">START</button>
          </motion.div>
        )}

        {(gameState === "showing" || gameState === "input") && (
          <>
            <div className="text-center mb-4">
              <span className={`text-xs font-bold ${gameState === "showing" ? "text-accent" : "text-primary"}`}>
                {gameState === "showing" ? "Watch carefully..." : `Your turn! ${playerInput.length}/${sequence.length}`}
              </span>
            </div>
            <div className="grid gap-2 mx-auto" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, maxWidth: `${gridSize * 80}px` }}>
              {Array.from({ length: totalCells }, (_, i) => (
                <motion.button
                  key={i}
                  whileTap={gameState === "input" ? { scale: 0.9 } : {}}
                  onClick={() => handleCellClick(i)}
                  className="aspect-square rounded-xl cursor-pointer"
                  style={{
                    background: activeCell === i
                      ? "linear-gradient(145deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
                      : "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
                    border: `2px solid ${activeCell === i ? "hsl(var(--primary))" : "hsl(var(--border) / 0.5)"}`,
                    boxShadow: activeCell === i ? "0 0 20px hsl(var(--primary) / 0.5)" : "0 4px 8px hsl(0 0% 0% / 0.3)",
                    transition: "all 0.2s",
                  }}
                />
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
                    <div className="text-5xl mb-3">🧠</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Perfect Memory!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">Sequence of {sequence.length}</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">NEXT LEVEL <ArrowRight className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">😵</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Wrong!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Got {playerInput.length}/{sequence.length} right</p>
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

export default PatternMemory;
