import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Gift, RotateCcw } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

function getConfig(level: number) {
  const boxes = 9;
  const prizes = Math.max(1, Math.floor(9 - level * 0.06));
  const bombs = Math.min(6, 2 + Math.floor(level * 0.04));
  const picksNeeded = Math.min(prizes, Math.max(1, Math.floor(prizes * 0.7)));
  return { boxes, prizes, bombs, picksNeeded };
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

type BoxContent = "prize" | "bomb" | "empty";
type BoxState = { content: BoxContent; revealed: boolean };

function generateBoxes(level: number): BoxState[] {
  const { boxes, prizes, bombs } = getConfig(level);
  const contents: BoxContent[] = [];
  for (let i = 0; i < prizes; i++) contents.push("prize");
  for (let i = 0; i < bombs; i++) contents.push("bomb");
  while (contents.length < boxes) contents.push("empty");
  for (let i = contents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [contents[i], contents[j]] = [contents[j], contents[i]];
  }
  return contents.map((c) => ({ content: c, revealed: false }));
}

const BOX_EMOJIS: Record<BoxContent, string> = { prize: "💎", bomb: "💣", empty: "📦" };

const LuckyBox = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["lucky-box"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [boxes, setBoxes] = useState<BoxState[]>(() => generateBoxes(level));
  const [prizesFound, setPrizesFound] = useState(0);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [earnedPoints, setEarnedPoints] = useState(0);

  const config = useMemo(() => getConfig(level), [level]);

  const handleOpen = useCallback((index: number) => {
    if (gameState !== "playing" || boxes[index].revealed) return;
    const updated = boxes.map((b, i) => i === index ? { ...b, revealed: true } : b);
    setBoxes(updated);

    const content = boxes[index].content;
    if (content === "bomb") {
      playClickBomb();
      setTimeout(() => {
        playGameOver();
        setBoxes((prev) => prev.map((b) => ({ ...b, revealed: true })));
        setGameState("lost");
      }, 500);
    } else if (content === "prize") {
      playClickSafe();
      const newFound = prizesFound + 1;
      setPrizesFound(newFound);
      if (newFound >= config.picksNeeded) {
        setTimeout(() => {
          playLevelWin();
          const pts = getPointsForLevel(level);
          setEarnedPoints(pts);
          addPoints(pts);
          updateProgress("lucky-box", level);
          setBoxes((prev) => prev.map((b) => ({ ...b, revealed: true })));
          setGameState("won");
        }, 400);
      }
    } else {
      playClickSafe();
    }
  }, [boxes, gameState, prizesFound, config, level, addPoints, updateProgress]);

  const nextLevel = () => {
    const next = Math.min(level + 1, 100);
    setLevel(next);
    setBoxes(generateBoxes(next));
    setPrizesFound(0);
    setGameState("playing");
    setEarnedPoints(0);
  };

  const retry = () => {
    setBoxes(generateBoxes(level));
    setPrizesFound(0);
    setGameState("playing");
    setEarnedPoints(0);
  };

  return (
    <GameLayout title="Lucky Box" level={level} points={data.points}>
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-xs text-muted-foreground">Prizes: <span className="text-primary font-bold">{prizesFound}/{config.picksNeeded}</span></span>
          <span className="text-xs text-muted-foreground">Bombs: <span className="text-destructive font-bold">{config.bombs}</span></span>
          <span className="text-xs text-muted-foreground">+{getPointsForLevel(level)} pts</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {boxes.map((box, i) => (
            <motion.button
              key={i}
              whileTap={!box.revealed ? { scale: 0.9 } : {}}
              whileHover={!box.revealed ? { scale: 1.05 } : {}}
              onClick={() => handleOpen(i)}
              className="aspect-square rounded-2xl cursor-pointer flex items-center justify-center text-4xl"
              style={{
                background: box.revealed
                  ? box.content === "bomb"
                    ? "linear-gradient(145deg, hsl(var(--destructive) / 0.3), hsl(var(--destructive) / 0.1))"
                    : box.content === "prize"
                    ? "linear-gradient(145deg, hsl(160 80% 20%), hsl(160 60% 12%))"
                    : "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--muted)))"
                  : "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
                border: `2px solid ${
                  box.revealed
                    ? box.content === "bomb" ? "hsl(var(--destructive) / 0.6)" : box.content === "prize" ? "hsl(160 80% 40% / 0.6)" : "hsl(var(--border))"
                    : "hsl(var(--border) / 0.5)"
                }`,
                boxShadow: box.revealed && box.content === "prize" ? "0 0 15px hsl(160 80% 50% / 0.3)" : box.revealed && box.content === "bomb" ? "0 0 15px hsl(var(--destructive) / 0.3)" : "0 4px 8px hsl(0 0% 0% / 0.3)",
              }}
            >
              <AnimatePresence mode="wait">
                {box.revealed ? (
                  <motion.span key="content" initial={{ scale: 0, rotateY: 90 }} animate={{ scale: 1, rotateY: 0 }} transition={{ type: "spring", stiffness: 300 }}>
                    {BOX_EMOJIS[box.content]}
                  </motion.span>
                ) : (
                  <motion.span key="hidden" className="text-3xl">
                    <Gift className="w-8 h-8 text-primary/50" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {gameState !== "playing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4" style={{ boxShadow: gameState === "won" ? "0 0 40px hsl(var(--primary) / 0.3)" : "0 0 40px hsl(var(--destructive) / 0.3)" }}>
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🎁</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Lucky!</h2>
                    <p className="font-display text-3xl font-black text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">Found {prizesFound} prizes</p>
                    <button onClick={nextLevel} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">
                      NEXT LEVEL <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">💣</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Boom!</h2>
                    <p className="text-muted-foreground text-xs mb-5">Hit a bomb!</p>
                    <button onClick={retry} className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-colors">
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

export default LuckyBox;
